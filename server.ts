import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { createClient } from '@libsql/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTursoConfigured = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim().length > 0
);

const db = createClient({
  url: isTursoConfigured
    ? (process.env.TURSO_DATABASE_URL as string)
    : 'file:ecocare_bookings.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function ensureSchemaAndSeed() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Care Companion',
      phone TEXT NOT NULL DEFAULT '+60 12-345 6789',
      photo_url TEXT,
      cpr_certificate_id TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      hospital_name TEXT,
      pickup_time TEXT,
      staff_id TEXT NOT NULL,
      current_status INTEGER NOT NULL DEFAULT 1 CHECK (current_status BETWEEN 1 AND 6),
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    )
  `);

  try {
    await db.execute(
      `ALTER TABLE staff ADD COLUMN role TEXT NOT NULL DEFAULT 'Care Companion'`
    );
  } catch {
    // Column already exists
  }

  try {
    await db.execute(
      `ALTER TABLE staff ADD COLUMN phone TEXT NOT NULL DEFAULT '+60 12-345 6789'`
    );
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN pickup_time TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN completed_at TEXT`);
  } catch {
    // Column already exists
  }

  // Safely widen legacy CHECK (current_status BETWEEN 1 AND 5) constraint to 1..6
  const ordersTableInfo = await db.execute(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'`
  );
  const ordersSql = String(ordersTableInfo.rows[0]?.sql ?? '');
  if (ordersSql.includes('BETWEEN 1 AND 5')) {
    await db.execute('PRAGMA foreign_keys = OFF');
    await db.execute(`
      CREATE TABLE orders_migrated (
        order_id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        hospital_name TEXT,
        pickup_time TEXT,
        staff_id TEXT NOT NULL,
        current_status INTEGER NOT NULL DEFAULT 1 CHECK (current_status BETWEEN 1 AND 6),
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )
    `);
    await db.execute(`
      INSERT INTO orders_migrated (order_id, client_name, hospital_name, pickup_time, staff_id, current_status, updated_at, completed_at)
      SELECT order_id, client_name, hospital_name, pickup_time, staff_id, current_status, updated_at, completed_at
      FROM orders
    `);
    await db.execute('DROP TABLE orders');
    await db.execute('ALTER TABLE orders_migrated RENAME TO orders');
    await db.execute('PRAGMA foreign_keys = ON');
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      patient_name TEXT NOT NULL,
      hospital_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      tier_id TEXT NOT NULL,
      tier_label TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      addons_json TEXT NOT NULL,
      total_price INTEGER NOT NULL,
      appointment_date TEXT,
      pickup_time TEXT,
      notes TEXT,
      whatsapp_message TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await db.execute(`
    INSERT OR IGNORE INTO staff (id, name, role, phone, photo_url, cpr_certificate_id)
    VALUES
      ('unassigned', 'Pending Dispatch', 'Unassigned', '', '', 'PENDING'),
      ('staff-dong-hao', 'Dong Hao', 'Senior Care Companion', '+60 12-345 6789', 'https://ui-avatars.com/api/?name=Dong+Hao&background=047857&color=ffffff&bold=true', 'SJAM-CPR-20612'),
      ('staff-yenchi', 'Yenchi', 'Care Companion', '+60 12-678 9012', 'https://ui-avatars.com/api/?name=Yenchi&background=0f766e&color=ffffff&bold=true', 'SJAM-CPR-20705'),
      ('staff-mei-ling', 'Mei Ling Tan', 'Senior Care Companion', '+60 12-456 7890', 'https://ui-avatars.com/api/?name=Mei+Ling+Tan&background=047857&color=ffffff&bold=true', 'SJAM-CPR-20489'),
      ('staff-amirul', 'Amirul Hakim', 'Care Companion', '+60 12-890 1234', 'https://ui-avatars.com/api/?name=Amirul+Hakim&background=0f766e&color=ffffff&bold=true', 'SJAM-CPR-20514')
  `);

  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT OR IGNORE INTO orders (order_id, client_name, hospital_name, pickup_time, staff_id, current_status, updated_at)
      VALUES
        ('ECE-8421', 'Mdm. Tan Siew Lan', 'Hospital Serdang', '09:00 AM', 'unassigned', 1, ?),
        ('ECE-8425', 'En. Ahmad Zaki', 'Hospital Putrajaya', '10:30 AM', 'unassigned', 1, ?),
        ('ECE-8430', 'Mdm. Lim Poh Choo', 'UMMC', '11:15 AM', 'unassigned', 1, ?),
        ('ECE-842190', 'Mdm. Tan Siew Lan', 'Hospital Serdang', '09:00 AM', 'staff-mei-ling', 3, ?),
        ('ECE-842205', 'En. Razak Bin Osman', 'Hospital Putrajaya', '08:30 AM', 'staff-amirul', 2, ?)
    `,
    args: [now, now, now, now, now],
  });

  await db.execute(`
    DELETE FROM orders WHERE order_id IN ('ECE-842318', 'ECE-842324')
  `);

  await db.execute(`
    UPDATE orders SET pickup_time = '09:00 AM' WHERE order_id = 'ECE-842190' AND (pickup_time IS NULL OR pickup_time = '')
  `);
  await db.execute(`
    UPDATE orders SET pickup_time = '08:30 AM' WHERE order_id = 'ECE-842205' AND (pickup_time IS NULL OR pickup_time = '')
  `);
}

interface BookingPayload {
  patientName?: string;
  hospitalName?: string;
  email?: string;
  phone?: string;
  tierId?: 'tier1' | 'tier2';
  needsWheelchair?: boolean;
  needsFastingMeal?: boolean;
  appointmentDate?: string;
  pickupTime?: string;
  notes?: string;
}

async function startServer() {
  await ensureSchemaAndSeed();

  const app = express();
  app.use(express.json());

  app.post('/api/bookings', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as BookingPayload;
      const patientName = (body.patientName || '').trim();
      const hospitalName = (body.hospitalName || '').trim();
      const tierId = body.tierId === 'tier2' ? 'tier2' : 'tier1';
      const needsWheelchair = Boolean(body.needsWheelchair);
      const needsFastingMeal = Boolean(body.needsFastingMeal);

      if (!patientName || !hospitalName) {
        res.status(400).json({
          error: 'Patient or caregiver name and hospital name are required.',
        });
        return;
      }

      const basePrice = tierId === 'tier2' ? 150 : 100;
      const tierLabel =
        tierId === 'tier2'
          ? 'Premium Proxy Package - RM 150'
          : 'Basic Care Package - RM 100';

      const addons: { id: string; label: string; price: number }[] = [];
      if (needsWheelchair) {
        addons.push({ id: 'wheelchair', label: 'Wheelchair Provision', price: 15 });
      }
      if (needsFastingMeal) {
        addons.push({ id: 'fasting_meal', label: 'Post-blood Test Meal Run', price: 10 });
      }

      const addonsTotal = addons.reduce((sum, item) => sum + item.price, 0);
      const totalPrice = basePrice + addonsTotal;

      const bookingId = `ECE-${Math.floor(100000 + Math.random() * 900000)}`;
      const createdAt = new Date().toISOString();
      const addonSummary =
        addons.length > 0
          ? addons.map((a) => `${a.label} (+RM ${a.price})`).join(', ')
          : 'None';

      const dateText = body.appointmentDate || 'TBD';
      const timeText = body.pickupTime || 'TBD';

      const whatsappMessage = `[EcoCare Escorts Booking Confirmation] Order ${bookingId} | Name: ${patientName} | Hospital: ${hospitalName} | Schedule: ${dateText} at ${timeText} | Package: ${tierLabel} | Add-ons: ${addonSummary} | Total Price: RM ${totalPrice}. Our Serdang student care team will confirm your companion details via WhatsApp (+60 12-345 6789) within 30 minutes.`;

      await db.execute({
        sql: `
          INSERT INTO bookings (
            id, patient_name, hospital_name, email, phone,
            tier_id, tier_label, base_price, addons_json, total_price,
            appointment_date, pickup_time, notes, whatsapp_message, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          bookingId,
          patientName,
          hospitalName,
          (body.email || '').trim(),
          (body.phone || '').trim(),
          tierId,
          tierLabel,
          basePrice,
          JSON.stringify(addons),
          totalPrice,
          dateText,
          timeText,
          (body.notes || '').trim(),
          whatsappMessage,
          createdAt,
        ],
      });

      // Automatically create a trackable order linked to an assigned companion
      await db.execute({
        sql: `
          INSERT INTO orders (order_id, client_name, hospital_name, pickup_time, staff_id, current_status, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `,
        args: [bookingId, patientName, hospitalName, timeText, 'staff-mei-ling', createdAt],
      });

      res.status(201).json({
        ok: true,
        bookingId,
        totalPrice,
        addons,
        storageTarget: isTursoConfigured ? 'turso' : 'local-libsql',
        whatsappMessage,
        createdAt,
      });
    } catch (error) {
      console.error('Failed to insert booking into libSQL/Turso:', error);
      res.status(500).json({
        error: 'Unable to save booking to database. Please try again.',
      });
    }
  });

  app.get('/api/bookings', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(
        'SELECT id, patient_name, hospital_name, tier_id, addons_json, total_price, appointment_date, pickup_time, created_at FROM bookings ORDER BY created_at DESC LIMIT 20'
      );
      res.json({ bookings: result.rows });
    } catch (error) {
      console.error('Failed to query bookings:', error);
      res.status(500).json({ error: 'Failed to load bookings.' });
    }
  });

  app.get('/api/staff', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(`
        SELECT id, name, role, phone, photo_url, cpr_certificate_id
        FROM staff
        WHERE id != 'unassigned'
        ORDER BY CASE id
          WHEN 'staff-dong-hao' THEN 1
          WHEN 'staff-yenchi' THEN 2
          WHEN 'staff-mei-ling' THEN 3
          WHEN 'staff-amirul' THEN 4
          ELSE 5
        END, name ASC
      `);
      res.status(200).json({ ok: true, staff: result.rows });
    } catch (error) {
      console.error('Failed to list staff:', error);
      res.status(500).json({ error: 'Failed to load staff directory.' });
    }
  });

  app.post('/api/update-staff-profile', async (req: Request, res: Response) => {
    try {
      const { id, name, phone, photo_url, cpr_certificate_id } = req.body || {};
      const staffId = typeof id === 'string' ? id.trim() : '';
      const fullName = typeof name === 'string' ? name.trim() : '';
      const phoneNumber = typeof phone === 'string' ? phone.trim() : '';
      const photoUrl = typeof photo_url === 'string' ? photo_url.trim() : '';
      const cprId =
        typeof cpr_certificate_id === 'string' ? cpr_certificate_id.trim() : '';

      if (!staffId || !fullName || !cprId) {
        res.status(400).json({
          error: 'Staff ID, full name, and CPR Certificate ID are required.',
        });
        return;
      }

      const result = await db.execute({
        sql: `
          UPDATE staff
          SET name = ?, phone = ?, photo_url = ?, cpr_certificate_id = ?
          WHERE id = ?
        `,
        args: [fullName, phoneNumber, photoUrl, cprId, staffId],
      });

      if (result.rowsAffected === 0) {
        res.status(404).json({ error: `Staff member ${staffId} not found.` });
        return;
      }

      res.status(200).json({
        ok: true,
        staff: {
          id: staffId,
          name: fullName,
          phone: phoneNumber,
          photo_url: photoUrl,
          cpr_certificate_id: cprId,
        },
      });
    } catch (error) {
      console.error('Failed to update staff profile:', error);
      res.status(500).json({ error: 'Failed to update staff profile.' });
    }
  });

  app.get('/api/pending-orders', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(`
        SELECT
          order_id,
          client_name,
          hospital_name,
          COALESCE(NULLIF(pickup_time, ''), '09:00 AM') AS pickup_time,
          staff_id,
          current_status,
          updated_at
        FROM orders
        WHERE staff_id = 'unassigned'
          AND (completed_at IS NULL OR completed_at = '')
        ORDER BY updated_at DESC
      `);
      res.status(200).json({ ok: true, pendingOrders: result.rows });
    } catch (error) {
      console.error('Failed to list pending orders:', error);
      res.status(500).json({ error: 'Failed to load pending orders.' });
    }
  });

  app.post('/api/claim-order', async (req: Request, res: Response) => {
    try {
      const { order_id, staff_id } = req.body || {};
      const orderId = typeof order_id === 'string' ? order_id.trim() : '';
      const staffId = typeof staff_id === 'string' ? staff_id.trim() : '';

      if (!orderId || !staffId || staffId === 'unassigned') {
        res.status(400).json({ error: 'Provide valid order_id and staff_id.' });
        return;
      }

      const updatedAt = new Date().toISOString();
      const result = await db.execute({
        sql: `
          UPDATE orders
          SET staff_id = ?, current_status = 1, updated_at = ?
          WHERE order_id = ?
        `,
        args: [staffId, updatedAt, orderId],
      });

      if (result.rowsAffected === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
        return;
      }

      const orderRes = await db.execute({
        sql: `
          SELECT
            order_id,
            client_name,
            hospital_name,
            COALESCE(NULLIF(pickup_time, ''), '09:00 AM') AS pickup_time,
            staff_id,
            current_status,
            updated_at
          FROM orders
          WHERE order_id = ?
          LIMIT 1
        `,
        args: [orderId],
      });

      res.status(200).json({ ok: true, order: orderRes.rows[0] });
    } catch (error) {
      console.error('Failed to claim order:', error);
      res.status(500).json({ error: 'Failed to claim order.' });
    }
  });

  app.post('/api/release-order', async (req: Request, res: Response) => {
    try {
      const { order_id } = req.body || {};
      const orderId = typeof order_id === 'string' ? order_id.trim() : '';
      if (!orderId) {
        res.status(400).json({ error: 'Provide valid order_id.' });
        return;
      }

      const updatedAt = new Date().toISOString();
      const result = await db.execute({
        sql: `
          UPDATE orders
          SET staff_id = 'unassigned', current_status = 1, updated_at = ?
          WHERE order_id = ?
        `,
        args: [updatedAt, orderId],
      });

      if (result.rowsAffected === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
        return;
      }

      res.status(200).json({ ok: true, order_id: orderId });
    } catch (error) {
      console.error('Failed to release order:', error);
      res.status(500).json({ error: 'Failed to release order.' });
    }
  });

  app.post('/api/complete-order', async (req: Request, res: Response) => {
    try {
      const { order_id } = req.body || {};
      const orderId = typeof order_id === 'string' ? order_id.trim() : '';
      if (!orderId) {
        res.status(400).json({ error: 'Provide valid order_id.' });
        return;
      }

      const nowIso = new Date().toISOString();
      const result = await db.execute({
        sql: `
          UPDATE orders
          SET current_status = 6, completed_at = ?, updated_at = ?
          WHERE order_id = ?
        `,
        args: [nowIso, nowIso, orderId],
      });

      if (result.rowsAffected === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
        return;
      }

      res.status(200).json({
        ok: true,
        order_id: orderId,
        current_status: 6,
        completed_at: nowIso,
      });
    } catch (error) {
      console.error('Failed to complete order:', error);
      res.status(500).json({ error: 'Failed to complete order.' });
    }
  });

  app.get('/api/orders', async (req: Request, res: Response) => {
    try {
      const staffId =
        typeof req.query?.staff_id === 'string' ? req.query.staff_id.trim() : '';

      if (staffId) {
        const staffResult = await db.execute({
          sql: `
            SELECT id, name, role, phone, photo_url, cpr_certificate_id
            FROM staff
            WHERE id = ?
            LIMIT 1
          `,
          args: [staffId],
        });

        if (staffResult.rows.length === 0) {
          res.status(404).json({ error: `Staff member "${staffId}" not found.` });
          return;
        }

        const ordersResult = await db.execute({
          sql: `
            SELECT
              o.order_id,
              o.client_name,
              o.hospital_name,
              COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
              o.staff_id,
              o.current_status,
              o.updated_at,
              s.name AS staff_name,
              s.role AS staff_role,
              s.phone AS staff_phone,
              s.photo_url AS staff_photo_url,
              s.cpr_certificate_id AS staff_cpr_certificate_id
            FROM orders o
            INNER JOIN staff s ON o.staff_id = s.id
            WHERE o.staff_id = ?
              AND (o.completed_at IS NULL OR o.completed_at = '')
            ORDER BY o.updated_at DESC
          `,
          args: [staffId],
        });

        res.status(200).json({
          ok: true,
          staff: staffResult.rows[0],
          activeOrder: ordersResult.rows[0] ?? null,
          orders: ordersResult.rows,
        });
        return;
      }

      const result = await db.execute(`
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
          o.staff_id,
          o.current_status,
          o.updated_at,
          s.name AS staff_name,
          s.role AS staff_role,
          s.phone AS staff_phone
        FROM orders o
        INNER JOIN staff s ON o.staff_id = s.id
        WHERE o.staff_id != 'unassigned'
        ORDER BY o.updated_at DESC
      `);
      res.status(200).json({ ok: true, orders: result.rows });
    } catch (error) {
      console.error('Failed to list orders:', error);
      res.status(500).json({ error: 'Failed to load active orders.' });
    }
  });

  app.post('/api/update-status', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const orderId =
        typeof body.order_id === 'string' ? body.order_id.trim().toUpperCase() : '';
      const rawStatus =
        body.status !== undefined ? body.status : body.current_status;
      const statusNum = Number(rawStatus);
      const staffId =
        typeof body.staff_id === 'string' && body.staff_id.trim().length > 0
          ? body.staff_id.trim()
          : null;

      if (!orderId || !Number.isInteger(statusNum) || statusNum < 1 || statusNum > 6) {
        res.status(400).json({
          error: 'Invalid payload. Provide a valid order_id and status (1-6).',
        });
        return;
      }

      const updatedAt = new Date().toISOString();
      const completedAt = statusNum === 6 ? updatedAt : null;
      const result = staffId
        ? await db.execute({
            sql: `
              UPDATE orders
              SET current_status = ?, staff_id = ?, completed_at = ?, updated_at = ?
              WHERE UPPER(order_id) = UPPER(?)
            `,
            args: [statusNum, staffId, completedAt, updatedAt, orderId],
          })
        : await db.execute({
            sql: `
              UPDATE orders
              SET current_status = ?, completed_at = ?, updated_at = ?
              WHERE UPPER(order_id) = UPPER(?)
            `,
            args: [statusNum, completedAt, updatedAt, orderId],
          });

      if (result.rowsAffected === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
        return;
      }

      res.status(200).json({
        ok: true,
        order_id: orderId,
        current_status: statusNum,
        status: statusNum,
        staff_id: staffId,
        updated_at: updatedAt,
        completed_at: completedAt,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      res.status(500).json({ error: 'Failed to update order status.' });
    }
  });

  app.get('/api/get-tracker', async (req: Request, res: Response) => {
    try {
      const rawOrderId =
        typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';

      if (!rawOrderId) {
        res.status(400).json({ error: 'Missing required order_id query parameter.' });
        return;
      }

      const normalizedOrderId = rawOrderId.replace(/^#/, '').toUpperCase();

      const result = await db.execute({
        sql: `
          SELECT
            o.order_id,
            o.client_name,
            o.hospital_name,
            COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
            o.current_status,
            o.updated_at,
            o.completed_at,
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE o.staff_id END AS staff_id,
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.name END AS staff_name,
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.role END AS staff_role,
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.phone END AS staff_phone,
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.photo_url END AS staff_photo_url,
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.cpr_certificate_id END AS staff_cpr_certificate_id
          FROM orders o
          LEFT JOIN staff s ON o.staff_id = s.id
          WHERE UPPER(o.order_id) = UPPER(?)
          LIMIT 1
        `,
        args: [normalizedOrderId],
      });

      if (result.rows.length === 0) {
        res.status(404).json({ error: `Order ${rawOrderId} not found.` });
        return;
      }

      res.status(200).json({
        ok: true,
        tracker: result.rows[0],
      });
    } catch (error) {
      console.error('Failed to fetch tracker data:', error);
      res.status(500).json({ error: 'Failed to fetch tracker data.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`EcoCare Escorts server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
