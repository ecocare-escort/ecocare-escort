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
      photo_url TEXT,
      cpr_certificate_id TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      hospital_name TEXT,
      staff_id TEXT NOT NULL,
      current_status INTEGER NOT NULL DEFAULT 1 CHECK (current_status BETWEEN 1 AND 5),
      updated_at TEXT NOT NULL,
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    )
  `);

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
    INSERT OR IGNORE INTO staff (id, name, photo_url, cpr_certificate_id)
    VALUES
      ('staff-mei-ling', 'Mei Ling Tan', '/companions/mei-ling.jpg', 'SJAM-CPR-20489'),
      ('staff-amirul', 'Amirul Hakim', '', 'SJAM-CPR-20514')
  `);

  const existingOrders = await db.execute('SELECT COUNT(*) AS cnt FROM orders');
  const orderCount = Number(existingOrders.rows[0]?.cnt ?? 0);
  if (orderCount === 0) {
    const now = new Date().toISOString();
    await db.execute({
      sql: `
        INSERT OR IGNORE INTO orders (order_id, client_name, hospital_name, staff_id, current_status, updated_at)
        VALUES
          ('ECE-842190', 'Mdm. Tan Siew Lan', 'Hospital Serdang', 'staff-mei-ling', 3, ?),
          ('ECE-842205', 'En. Razak Bin Osman', 'Hospital Putrajaya', 'staff-amirul', 2, ?)
      `,
      args: [now, now],
    });
  }
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
          INSERT INTO orders (order_id, client_name, hospital_name, staff_id, current_status, updated_at)
          VALUES (?, ?, ?, ?, 1, ?)
        `,
        args: [bookingId, patientName, hospitalName, 'staff-mei-ling', createdAt],
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

  app.get('/api/orders', async (_req: Request, res: Response) => {
    try {
      const result = await db.execute(`
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          o.current_status,
          o.updated_at,
          s.name AS staff_name
        FROM orders o
        INNER JOIN staff s ON o.staff_id = s.id
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
      const { order_id, current_status } = req.body || {};
      const orderId = typeof order_id === 'string' ? order_id.trim() : '';
      const statusNum = Number(current_status);

      if (!orderId || !Number.isInteger(statusNum) || statusNum < 1 || statusNum > 5) {
        res.status(400).json({
          error: 'Invalid payload. Provide a valid order_id and current_status (1-5).',
        });
        return;
      }

      const updatedAt = new Date().toISOString();
      const result = await db.execute({
        sql: `
          UPDATE orders
          SET current_status = ?, updated_at = ?
          WHERE order_id = ?
        `,
        args: [statusNum, updatedAt, orderId],
      });

      if (result.rowsAffected === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
        return;
      }

      res.status(200).json({
        ok: true,
        order_id: orderId,
        current_status: statusNum,
        updated_at: updatedAt,
      });
    } catch (error) {
      console.error('Failed to update order status:', error);
      res.status(500).json({ error: 'Failed to update order status.' });
    }
  });

  app.get('/api/get-tracker', async (req: Request, res: Response) => {
    try {
      const orderId =
        typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';

      if (!orderId) {
        res.status(400).json({ error: 'Missing required order_id query parameter.' });
        return;
      }

      const result = await db.execute({
        sql: `
          SELECT
            o.order_id,
            o.client_name,
            o.hospital_name,
            o.current_status,
            o.updated_at,
            s.id AS staff_id,
            s.name AS staff_name,
            s.photo_url AS staff_photo_url,
            s.cpr_certificate_id AS staff_cpr_certificate_id
          FROM orders o
          INNER JOIN staff s ON o.staff_id = s.id
          WHERE o.order_id = ?
          LIMIT 1
        `,
        args: [orderId],
      });

      if (result.rows.length === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
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
