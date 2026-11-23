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

const formatMalaysiaPhone = (input: string): string => {
  const raw = String(input || '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;

  let local = digits;
  if (digits.startsWith('60') && digits.length >= 10) {
    local = digits.slice(2);
  } else if (digits.startsWith('0')) {
    local = digits.slice(1);
  }

  if ((local.startsWith('11') || local.startsWith('15')) && local.length === 10) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6, 10)}`;
  }

  if (local.startsWith('1') && local.length === 9) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 5)} ${local.slice(5, 9)}`;
  }

  if (local.startsWith('1') && local.length === 10) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6, 10)}`;
  }

  if (local.startsWith('3') && local.length === 9) {
    return `+60 ${local.slice(0, 1)}-${local.slice(1, 5)} ${local.slice(5, 9)}`;
  }

  return raw;
};

const DEFAULT_LOGIN_IDS: Record<string, string> = {
  unassigned: 'unassigned',
  'staff-dong-hao': 'donghao',
  'staff-yenchi': 'yenchi',
  'staff-mei-ling': 'meiling',
  'staff-amirul': 'amirul',
};

async function ensureSchemaAndSeed() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Care Companion',
      phone TEXT NOT NULL DEFAULT '+60 12-345 6789',
      photo_url TEXT,
      cpr_certificate_id TEXT NOT NULL,
      login_id TEXT,
      passcode TEXT DEFAULT '123456',
      is_driver INTEGER DEFAULT 0,
      vehicle_model TEXT,
      vehicle_color TEXT,
      vehicle_plate TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      hospital_name TEXT,
      pickup_time TEXT,
      staff_id TEXT NOT NULL,
      driver_id TEXT,
      current_status INTEGER NOT NULL DEFAULT 1 CHECK (current_status BETWEEN 1 AND 6),
      is_b40 INTEGER DEFAULT 0,
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
    await db.execute(`ALTER TABLE staff ADD COLUMN login_id TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE staff ADD COLUMN passcode TEXT DEFAULT '123456'`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE staff ADD COLUMN is_driver INTEGER DEFAULT 0`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE staff ADD COLUMN vehicle_model TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE staff ADD COLUMN vehicle_color TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE staff ADD COLUMN vehicle_plate TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN hospital_name TEXT`);
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

  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN driver_id TEXT`);
  } catch {
    // Column already exists
  }

  try {
    await db.execute(`ALTER TABLE orders ADD COLUMN is_b40 INTEGER DEFAULT 0`);
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
      pickup_zone TEXT DEFAULT 'serdang',
      distance_km INTEGER DEFAULT 0,
      mileage_fee INTEGER DEFAULT 0,
      is_b40 INTEGER DEFAULT 0,
      total_price INTEGER NOT NULL,
      appointment_date TEXT,
      pickup_time TEXT,
      notes TEXT,
      whatsapp_message TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  for (const sql of [
    `ALTER TABLE bookings ADD COLUMN pickup_zone TEXT DEFAULT 'serdang'`,
    `ALTER TABLE bookings ADD COLUMN distance_km INTEGER DEFAULT 0`,
    `ALTER TABLE bookings ADD COLUMN mileage_fee INTEGER DEFAULT 0`,
    `ALTER TABLE bookings ADD COLUMN is_b40 INTEGER DEFAULT 0`,
  ]) {
    try {
      await db.execute(sql);
    } catch {
      // Column already exists
    }
  }

  // Always ensure the 'unassigned' sentinel row exists for pending orders / FK safety
  await db.execute(`
    INSERT OR IGNORE INTO staff (id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode)
    VALUES ('unassigned', 'Pending Dispatch', 'Unassigned', '', '', 'PENDING', 'unassigned', '123456')
  `);

  // Only seed default staff if no real staff members exist yet (brand new / empty DB)
  const staffCountResult = await db.execute(
    `SELECT COUNT(*) AS count FROM staff WHERE id != 'unassigned'`
  );
  const staffCount = Number(staffCountResult.rows[0]?.count ?? 0);

  if (staffCount === 0) {
    await db.execute(`
      INSERT OR IGNORE INTO staff (id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode)
      VALUES
        ('staff-dong-hao', 'Dong Hao', 'Senior Care Companion', '+60 12-345 6789', 'https://ui-avatars.com/api/?name=Dong+Hao&background=047857&color=ffffff&bold=true', 'SJAM-CPR-20612', 'donghao', '123456'),
        ('staff-yenchi', 'Yenchi', 'Care Companion', '+60 12-678 9012', 'https://ui-avatars.com/api/?name=Yenchi&background=0f766e&color=ffffff&bold=true', 'SJAM-CPR-20705', 'yenchi', '123456'),
        ('staff-mei-ling', 'Mei Ling Tan', 'Senior Care Companion', '+60 12-456 7890', 'https://ui-avatars.com/api/?name=Mei+Ling+Tan&background=047857&color=ffffff&bold=true', 'SJAM-CPR-20489', 'meiling', '123456'),
        ('staff-amirul', 'Amirul Hakim', 'Care Companion', '+60 12-890 1234', 'https://ui-avatars.com/api/?name=Amirul+Hakim&background=0f766e&color=ffffff&bold=true', 'SJAM-CPR-20514', 'amirul', '123456')
    `);
  }

  const existingStaff = await db.execute(`SELECT id, name, login_id, passcode FROM staff`);
  for (const row of existingStaff.rows) {
    const id = String(row.id);
    const currentLogin = row.login_id ? String(row.login_id).trim() : '';
    const currentPasscode = row.passcode ? String(row.passcode).trim() : '';
    if (!currentLogin || !currentPasscode) {
      const fallbackSlug =
        DEFAULT_LOGIN_IDS[id] ||
        String(row.name || id)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '') ||
        id;
      await db.execute({
        sql: `UPDATE staff SET login_id = ?, passcode = ? WHERE id = ?`,
        args: [currentLogin || fallbackSlug, currentPasscode || '123456', id],
      });
    }
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    )
  `);

  await db.execute(`
    INSERT OR IGNORE INTO app_counters (name, value) VALUES ('order_seq', 0)
  `);

  // Only seed default orders if the database has never seeded orders before
  const ordersSeedFlagRes = await db.execute({
    sql: `SELECT value FROM app_settings WHERE key = 'orders_seeded' LIMIT 1`,
    args: [],
  });
  const ordersAlreadySeeded =
    ordersSeedFlagRes.rows.length > 0 &&
    String(ordersSeedFlagRes.rows[0]?.value ?? '') === '1';

  if (!ordersAlreadySeeded) {
    const ordersCountResult = await db.execute(`SELECT COUNT(*) AS count FROM orders`);
    const ordersCount = Number(ordersCountResult.rows[0]?.count ?? 0);

    if (ordersCount === 0) {
      const existingIds = new Set(existingStaff.rows.map((r) => String(r.id)));
      const meiLingStaffId = existingIds.has('staff-mei-ling')
        ? 'staff-mei-ling'
        : 'unassigned';
      const amirulStaffId = existingIds.has('staff-amirul')
        ? 'staff-amirul'
        : 'unassigned';

      const now = new Date().toISOString();
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO orders (order_id, client_name, hospital_name, pickup_time, staff_id, current_status, updated_at)
          VALUES
            ('ECE-8421', 'Mdm. Tan Siew Lan', 'Hospital Serdang', '09:00 AM', 'unassigned', 1, ?),
            ('ECE-8425', 'En. Ahmad Zaki', 'Hospital Putrajaya', '10:30 AM', 'unassigned', 1, ?),
            ('ECE-8430', 'Mdm. Lim Poh Choo', 'UMMC', '11:15 AM', 'unassigned', 1, ?),
            ('ECE-842190', 'Mdm. Tan Siew Lan', 'Hospital Serdang', '09:00 AM', ?, 3, ?),
            ('ECE-842205', 'En. Razak Bin Osman', 'Hospital Putrajaya', '08:30 AM', ?, 2, ?)
        `,
        args: [now, now, now, meiLingStaffId, now, amirulStaffId, now],
      });
    }

    await db.execute(`
      INSERT OR REPLACE INTO app_settings (key, value)
      VALUES ('orders_seeded', '1')
    `);
  }

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

async function assignAvailableDriver(dbClient = db): Promise<string | null> {
  const result = await dbClient.execute(`
    SELECT
      s.id,
      COUNT(CASE WHEN o.current_status < 6 THEN 1 END) AS active_count
    FROM staff s
    LEFT JOIN orders o ON o.driver_id = s.id
    WHERE COALESCE(s.is_driver, 0) = 1
      AND s.id != 'unassigned'
    GROUP BY s.id
    ORDER BY active_count ASC, RANDOM()
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return String(result.rows[0].id);
}

async function getNextOrderId(dbClient = db): Promise<string> {
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS app_counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    )
  `);
  await dbClient.execute(`
    INSERT OR IGNORE INTO app_counters (name, value) VALUES ('order_seq', 0)
  `);

  const result = await dbClient.execute(`
    UPDATE app_counters
    SET value = value + 1
    WHERE name = 'order_seq'
    RETURNING value
  `);

  const nextNum = Number(result.rows[0]?.value ?? 1);
  return `ECE-${String(nextNum).padStart(4, '0')}`;
}

interface BookingPayload {
  patientName?: string;
  hospitalName?: string;
  email?: string;
  phone?: string;
  tierId?: 'tier1' | 'tier2';
  is_b40?: boolean;
  isB40?: boolean;
  needsWheelchair?: boolean;
  needsFastingMeal?: boolean;
  pickupZone?: 'serdang' | 'other';
  distanceKm?: number;
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
      const isB40 = Boolean(body.is_b40 ?? body.isB40);
      const tierId = isB40 ? 'tier2' : body.tierId === 'tier2' ? 'tier2' : 'tier1';
      const needsWheelchair = Boolean(body.needsWheelchair);
      const needsFastingMeal = Boolean(body.needsFastingMeal);

      const rawPickupZone = String(body.pickupZone || 'serdang').trim().toLowerCase();
      const pickupZone = rawPickupZone === 'other' ? 'other' : 'serdang';
      const parsedDistance = Number(body.distanceKm ?? (pickupZone === 'other' ? 15 : 0));
      const distanceKm =
        pickupZone === 'other'
          ? Math.max(11, Math.round(Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : 15))
          : 0;
      const extraKm = pickupZone === 'other' ? Math.max(0, distanceKm - 10) : 0;
      const mileageFee = extraKm * 2;

      if (!patientName || !hospitalName) {
        res.status(400).json({
          error: 'Patient or caregiver name and hospital name are required.',
        });
        return;
      }

      const basePrice = isB40 ? 150 : tierId === 'tier2' ? 200 : 150;
      const tierLabel = isB40
        ? 'Premium Proxy Package - RM 150 (B40 Inclusive Care)'
        : tierId === 'tier2'
          ? 'Premium Proxy Package - RM 200'
          : 'Basic Care Package - RM 150';

      const addons: { id: string; label: string; price: number }[] = [];
      if (needsWheelchair) {
        addons.push({ id: 'wheelchair', label: 'Wheelchair Provision', price: 15 });
      }
      if (needsFastingMeal) {
        addons.push({ id: 'fasting_meal', label: 'Post-blood Test Meal Run', price: 10 });
      }

      const addonsTotal = addons.reduce((sum, item) => sum + item.price, 0);
      const totalPrice = basePrice + addonsTotal + mileageFee;

      const bookingId = await getNextOrderId(db);
      const createdAt = new Date().toISOString();
      const addonSummary =
        addons.length > 0
          ? addons.map((a) => `${a.label} (+RM ${a.price})`).join(', ')
          : 'None';

      const mileageSummary =
        pickupZone === 'other'
          ? `Other Klang Valley (${distanceKm} km, ${extraKm} km x RM 2 = +RM ${mileageFee})`
          : 'Serdang Free Zone (<= 10 km, RM 0)';

      const dateText = body.appointmentDate || 'TBD';
      const timeText = body.pickupTime || 'TBD';
      const b40WhatsAppSegment = isB40
        ? ' | B40 Inclusive Care: Yes (Premium Package @ RM 150 — I will attach my STR verification screenshot here)'
        : '';

      const whatsappMessage = `[EcoCare Escorts Booking Confirmation] Order ${bookingId} | Name: ${patientName} | Hospital: ${hospitalName} | Schedule: ${dateText} at ${timeText} | Package: ${tierLabel}${b40WhatsAppSegment} | Add-ons: ${addonSummary} | Mileage: ${mileageSummary} | Total Price: RM ${totalPrice}. Our Serdang student care team will confirm your companion details via WhatsApp (+60 12-345 6789) within 30 minutes.`;

      await db.execute({
        sql: `
          INSERT INTO bookings (
            id, patient_name, hospital_name, email, phone,
            tier_id, tier_label, base_price, addons_json, pickup_zone, distance_km, mileage_fee, is_b40, total_price,
            appointment_date, pickup_time, notes, whatsapp_message, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          pickupZone,
          distanceKm,
          mileageFee,
          isB40 ? 1 : 0,
          totalPrice,
          dateText,
          timeText,
          (body.notes || '').trim(),
          whatsappMessage,
          createdAt,
        ],
      });

      const assignedDriverId = await assignAvailableDriver(db);

      // Automatically create an unassigned pending order (status 1) with auto-dispatched driver for Employee Portal & Live Tracker
      await db.execute({
        sql: `
          INSERT INTO orders (order_id, client_name, hospital_name, pickup_time, staff_id, driver_id, current_status, is_b40, updated_at)
          VALUES (?, ?, ?, ?, 'unassigned', ?, 1, ?, ?)
        `,
        args: [bookingId, patientName, hospitalName, timeText, assignedDriverId, isB40 ? 1 : 0, createdAt],
      });

      res.status(200).json({
        ok: true,
        order_id: bookingId,
        bookingId,
        driver_id: assignedDriverId,
        is_b40: isB40 ? 1 : 0,
        tierId,
        tierLabel,
        basePrice,
        addonsTotal,
        pickupZone,
        distanceKm,
        extraKm,
        mileageFee,
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
        'SELECT id, patient_name, hospital_name, tier_id, addons_json, pickup_zone, distance_km, mileage_fee, COALESCE(is_b40, 0) AS is_b40, total_price, appointment_date, pickup_time, created_at FROM bookings ORDER BY created_at DESC LIMIT 20'
      );
      res.json({ bookings: result.rows });
    } catch (error) {
      console.error('Failed to query bookings:', error);
      res.status(500).json({ error: 'Failed to load bookings.' });
    }
  });

  const isAuthorizedAdmin = (req: Request): boolean => {
    const expected = (process.env.ADMIN_PASSCODE || 'ecocare2026').trim();
    const headerVal = req.headers['x-admin-passcode'];
    const provided = Array.isArray(headerVal)
      ? String(headerVal[0] || '').trim()
      : typeof headerVal === 'string'
        ? headerVal.trim()
        : '';
    return provided.length > 0 && provided === expected;
  };

  const normalizeLoginId = (input: unknown, fallbackName: string): string => {
    const raw = String(input || '').trim().toLowerCase().replace(/\s+/g, '');
    if (raw) return raw.replace(/[^a-z0-9._-]/g, '');
    const fromName = String(fallbackName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 24);
    return fromName || `companion${Math.floor(100 + Math.random() * 900)}`;
  };

  const defaultAvatarUrl = (name: string): string =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=047857&color=ffffff&bold=true`;

  app.get('/api/staff', async (req: Request, res: Response) => {
    try {
      const adminVerified = isAuthorizedAdmin(req);
      if (req.query?.verify === '1' && !adminVerified) {
        res.status(401).json({ error: 'Invalid admin passcode.' });
        return;
      }

      const columns = adminVerified
        ? 'id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode, COALESCE(is_driver, 0) AS is_driver, vehicle_model, vehicle_color, vehicle_plate'
        : 'id, name, role, photo_url, cpr_certificate_id, COALESCE(is_driver, 0) AS is_driver, vehicle_model, vehicle_color, vehicle_plate';

      const result = await db.execute(`
        SELECT ${columns}
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

  app.post('/api/staff', async (req: Request, res: Response) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        res.status(401).json({ error: 'Unauthorized. Valid admin passcode required.' });
        return;
      }

      const body = req.body || {};
      const name = String(body.name ?? '').trim();
      const role = String(body.role ?? '').trim() || 'Care Companion';
      const formattedPhone = formatMalaysiaPhone(String(body.phone ?? '').trim());
      const cprCertificateId = String(body.cpr_certificate_id ?? '').trim();
      const customPhotoUrl = String(body.photo_url ?? '').trim();
      const requestedLoginId = String(body.login_id ?? '').trim();
      const passcode = String(body.passcode ?? '').trim() || '123456';
      const isDriver =
        body.is_driver === true || Number(body.is_driver) === 1 ? 1 : 0;
      const vehicleModel = isDriver
        ? String(body.vehicle_model ?? '').trim() || null
        : null;
      const vehicleColor = isDriver
        ? String(body.vehicle_color ?? '').trim() || null
        : null;
      const vehiclePlate = isDriver
        ? String(body.vehicle_plate ?? '').trim().toUpperCase() || null
        : null;

      if (!name || !formattedPhone || !cprCertificateId) {
        res.status(400).json({
          error: 'Full Name, Phone, and CPR Certificate ID are required.',
        });
        return;
      }

      if (isDriver && (!vehicleModel || !vehiclePlate)) {
        res.status(400).json({
          error: 'Vehicle Model and Plate Number are required for designated drivers.',
        });
        return;
      }

      let loginId = normalizeLoginId(requestedLoginId, name);
      const conflictCheck = await db.execute({
        sql: `SELECT id FROM staff WHERE LOWER(login_id) = LOWER(?) LIMIT 1`,
        args: [loginId],
      });
      if (conflictCheck.rows.length > 0) {
        if (requestedLoginId) {
          res.status(409).json({
            error: `Login ID "${loginId}" is already assigned to another staff member.`,
          });
          return;
        }
        loginId = `${loginId}${Math.floor(10 + Math.random() * 90)}`;
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);
      const staffId = `staff-${slug || 'companion'}-${Math.floor(100 + Math.random() * 900)}`;
      const photoUrl = customPhotoUrl || defaultAvatarUrl(name);

      await db.execute({
        sql: `
          INSERT INTO staff (id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode, is_driver, vehicle_model, vehicle_color, vehicle_plate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          staffId,
          name,
          role,
          formattedPhone,
          photoUrl,
          cprCertificateId,
          loginId,
          passcode,
          isDriver,
          vehicleModel,
          vehicleColor,
          vehiclePlate,
        ],
      });

      res.status(201).json({
        ok: true,
        staff: {
          id: staffId,
          name,
          role,
          phone: formattedPhone,
          photo_url: photoUrl,
          cpr_certificate_id: cprCertificateId,
          login_id: loginId,
          passcode,
          is_driver: isDriver,
          vehicle_model: vehicleModel,
          vehicle_color: vehicleColor,
          vehicle_plate: vehiclePlate,
        },
      });
    } catch (error) {
      console.error('Failed to add staff member:', error);
      res.status(500).json({ error: 'Failed to add staff member.' });
    }
  });

  app.put('/api/staff', async (req: Request, res: Response) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        res.status(401).json({ error: 'Unauthorized. Valid admin passcode required.' });
        return;
      }

      const body = req.body || {};
      const staffId = String(body.id ?? '').trim();
      if (!staffId) {
        res.status(400).json({ error: 'Missing required staff id.' });
        return;
      }
      if (staffId === 'unassigned') {
        res.status(400).json({
          error: "Cannot modify the system 'unassigned' dispatch record.",
        });
        return;
      }

      const existingRes = await db.execute({
        sql: `SELECT id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode, COALESCE(is_driver, 0) AS is_driver, vehicle_model, vehicle_color, vehicle_plate FROM staff WHERE id = ? LIMIT 1`,
        args: [staffId],
      });
      if (existingRes.rows.length === 0) {
        res.status(404).json({ error: `Staff member "${staffId}" not found.` });
        return;
      }
      const existing = existingRes.rows[0];

      const name = String(body.name ?? existing.name ?? '').trim();
      const role = String(body.role ?? existing.role ?? '').trim() || 'Care Companion';
      const formattedPhone = formatMalaysiaPhone(
        String(body.phone ?? existing.phone ?? '').trim()
      );
      const cprCertificateId = String(
        body.cpr_certificate_id ?? existing.cpr_certificate_id ?? ''
      ).trim();
      const customPhotoUrl =
        body.photo_url !== undefined
          ? String(body.photo_url || '').trim()
          : String(existing.photo_url || '').trim();
      const nextLoginId = normalizeLoginId(
        body.login_id !== undefined ? body.login_id : existing.login_id,
        name
      );
      const nextPasscode =
        String(body.passcode ?? '').trim() ||
        String(existing.passcode ?? '').trim() ||
        '123456';

      const nextIsDriver =
        body.is_driver !== undefined
          ? body.is_driver === true || Number(body.is_driver) === 1
            ? 1
            : 0
          : Number(existing.is_driver || 0) === 1
            ? 1
            : 0;
      const nextVehicleModel = nextIsDriver
        ? String(
            body.vehicle_model !== undefined
              ? body.vehicle_model
              : existing.vehicle_model ?? ''
          ).trim() || null
        : null;
      const nextVehicleColor = nextIsDriver
        ? String(
            body.vehicle_color !== undefined
              ? body.vehicle_color
              : existing.vehicle_color ?? ''
          ).trim() || null
        : null;
      const nextVehiclePlate = nextIsDriver
        ? String(
            body.vehicle_plate !== undefined
              ? body.vehicle_plate
              : existing.vehicle_plate ?? ''
          )
            .trim()
            .toUpperCase() || null
        : null;

      if (!name || !formattedPhone || !cprCertificateId || !nextLoginId) {
        res.status(400).json({
          error: 'Full Name, Phone, CPR Certificate ID, and Login ID are required.',
        });
        return;
      }

      if (nextIsDriver && (!nextVehicleModel || !nextVehiclePlate)) {
        res.status(400).json({
          error: 'Vehicle Model and Plate Number are required for designated drivers.',
        });
        return;
      }

      const loginConflict = await db.execute({
        sql: `SELECT id FROM staff WHERE LOWER(login_id) = LOWER(?) AND id != ? LIMIT 1`,
        args: [nextLoginId, staffId],
      });
      if (loginConflict.rows.length > 0) {
        res.status(409).json({
          error: `Login ID "${nextLoginId}" is already used by another staff member.`,
        });
        return;
      }

      const nextPhotoUrl = customPhotoUrl || defaultAvatarUrl(name);

      await db.execute({
        sql: `
          UPDATE staff
          SET name = ?, role = ?, phone = ?, photo_url = ?, cpr_certificate_id = ?, login_id = ?, passcode = ?, is_driver = ?, vehicle_model = ?, vehicle_color = ?, vehicle_plate = ?
          WHERE id = ?
        `,
        args: [
          name,
          role,
          formattedPhone,
          nextPhotoUrl,
          cprCertificateId,
          nextLoginId,
          nextPasscode,
          nextIsDriver,
          nextVehicleModel,
          nextVehicleColor,
          nextVehiclePlate,
          staffId,
        ],
      });

      res.status(200).json({
        ok: true,
        staff: {
          id: staffId,
          name,
          role,
          phone: formattedPhone,
          photo_url: nextPhotoUrl,
          cpr_certificate_id: cprCertificateId,
          login_id: nextLoginId,
          passcode: nextPasscode,
          is_driver: nextIsDriver,
          vehicle_model: nextVehicleModel,
          vehicle_color: nextVehicleColor,
          vehicle_plate: nextVehiclePlate,
        },
      });
    } catch (error) {
      console.error('Failed to update staff member:', error);
      res.status(500).json({ error: 'Failed to update staff member.' });
    }
  });

  app.delete('/api/staff', async (req: Request, res: Response) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        res.status(401).json({ error: 'Unauthorized. Valid admin passcode required.' });
        return;
      }

      const queryId =
        typeof req.query?.id === 'string' ? req.query.id.trim() : '';
      const bodyId =
        typeof req.body?.id === 'string' ? req.body.id.trim() : '';
      const staffId = queryId || bodyId;

      if (!staffId) {
        res.status(400).json({ error: 'Missing required staff id.' });
        return;
      }

      if (staffId === 'unassigned') {
        res.status(400).json({
          error: "Cannot delete the system 'unassigned' dispatch record.",
        });
        return;
      }

      await db.execute({
        sql: `UPDATE orders SET staff_id = 'unassigned' WHERE staff_id = ?`,
        args: [staffId],
      });
      await db.execute({
        sql: `UPDATE orders SET driver_id = NULL WHERE driver_id = ?`,
        args: [staffId],
      });

      const deleteResult = await db.execute({
        sql: `DELETE FROM staff WHERE id = ?`,
        args: [staffId],
      });

      if (deleteResult.rowsAffected === 0) {
        res.status(404).json({ error: `Staff member "${staffId}" not found.` });
        return;
      }

      res.status(200).json({ ok: true, deletedId: staffId });
    } catch (error) {
      console.error('Failed to delete staff member:', error);
      res.status(500).json({ error: 'Failed to remove staff member.' });
    }
  });

  app.post('/api/staff-login', async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const loginId = String(body.login_id ?? body.username ?? '').trim();
      const passcode = String(body.passcode ?? body.password ?? '').trim();

      if (!loginId || !passcode) {
        res.status(400).json({ error: 'Please enter your Login ID and passcode.' });
        return;
      }

      const result = await db.execute({
        sql: `
          SELECT
            id,
            name,
            role,
            phone,
            photo_url,
            cpr_certificate_id,
            login_id,
            COALESCE(is_driver, 0) AS is_driver,
            vehicle_model,
            vehicle_color,
            vehicle_plate
          FROM staff
          WHERE LOWER(login_id) = LOWER(?)
            AND passcode = ?
            AND id != 'unassigned'
          LIMIT 1
        `,
        args: [loginId, passcode],
      });

      if (result.rows.length === 0) {
        res.status(401).json({ error: 'Invalid Login ID or passcode.' });
        return;
      }

      const staff = result.rows[0];

      res.status(200).json({
        ok: true,
        staff: {
          id: staff.id,
          name: staff.name,
          role: staff.role,
          phone: staff.phone,
          photo_url: staff.photo_url,
          cpr_certificate_id: staff.cpr_certificate_id,
          login_id: staff.login_id,
          is_driver: Number(staff.is_driver || 0),
          vehicle_model: staff.vehicle_model ?? null,
          vehicle_color: staff.vehicle_color ?? null,
          vehicle_plate: staff.vehicle_plate ?? null,
        },
      });
    } catch (error) {
      console.error('Failed to verify staff login:', error);
      res.status(500).json({ error: 'Failed to verify staff credentials.' });
    }
  });

  app.post('/api/update-staff-profile', async (req: Request, res: Response) => {
    try {
      const { id, name, phone, photo_url, cpr_certificate_id } = req.body || {};
      const staffId = typeof id === 'string' ? id.trim() : '';
      const fullName = typeof name === 'string' ? name.trim() : '';
      const phoneNumber = formatMalaysiaPhone(
        typeof phone === 'string' ? phone.trim() : ''
      );
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

  app.get('/api/staff-orders', async (req: Request, res: Response) => {
    try {
      const staffId =
        typeof req.query?.staff_id === 'string' ? req.query.staff_id.trim() : '';

      if (!staffId || staffId === 'unassigned') {
        res.status(400).json({ error: 'Missing required staff_id query parameter.' });
        return;
      }

      const staffResult = await db.execute({
        sql: `
          SELECT
            id,
            name,
            role,
            phone,
            photo_url,
            cpr_certificate_id,
            login_id,
            COALESCE(is_driver, 0) AS is_driver,
            vehicle_model,
            vehicle_color,
            vehicle_plate
          FROM staff
          WHERE id = ? AND id != 'unassigned'
          LIMIT 1
        `,
        args: [staffId],
      });

      if (staffResult.rows.length === 0) {
        res.status(404).json({ error: `Staff member "${staffId}" not found.` });
        return;
      }

      const myOrdersResult = await db.execute({
        sql: `
          SELECT
            o.order_id,
            o.client_name,
            o.hospital_name,
            COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
            o.staff_id,
            o.driver_id,
            o.current_status,
            o.updated_at,
            CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.name END AS companion_name,
            CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.phone END AS companion_phone,
            CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.name END AS driver_name,
            CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.phone END AS driver_phone,
            CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_model END AS driver_vehicle_model,
            CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_color END AS driver_vehicle_color,
            CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_plate END AS driver_vehicle_plate
          FROM orders o
          LEFT JOIN staff c ON o.staff_id = c.id
          LEFT JOIN staff d ON o.driver_id = d.id
          WHERE (o.staff_id = ? OR o.driver_id = ?)
            AND o.current_status < 6
            AND (o.completed_at IS NULL OR o.completed_at = '')
          ORDER BY o.updated_at DESC
        `,
        args: [staffId, staffId],
      });

      const pendingOrdersResult = await db.execute(`
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
          o.staff_id,
          o.driver_id,
          o.current_status,
          o.updated_at,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.name END AS driver_name,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_model END AS driver_vehicle_model,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_plate END AS driver_vehicle_plate
        FROM orders o
        LEFT JOIN staff d ON o.driver_id = d.id
        WHERE o.staff_id = 'unassigned'
          AND o.current_status < 6
          AND (o.completed_at IS NULL OR o.completed_at = '')
        ORDER BY o.updated_at DESC
      `);

      const staffRow = staffResult.rows[0];
      res.status(200).json({
        ok: true,
        staff: {
          ...staffRow,
          is_driver: Number(staffRow.is_driver || 0),
        },
        myOrders: myOrdersResult.rows,
        pendingOrders: pendingOrdersResult.rows,
      });
    } catch (error) {
      console.error('Failed to load staff orders:', error);
      res.status(500).json({ error: 'Failed to load staff orders from Turso.' });
    }
  });

  app.get('/api/orders', async (req: Request, res: Response) => {
    try {
      const staffId =
        typeof req.query?.staff_id === 'string' ? req.query.staff_id.trim() : '';

      if (staffId) {
        const staffResult = await db.execute({
          sql: `
            SELECT id, name, role, phone, photo_url, cpr_certificate_id, COALESCE(is_driver, 0) AS is_driver, vehicle_model, vehicle_color, vehicle_plate
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
              o.driver_id,
              o.current_status,
              o.updated_at,
              s.name AS staff_name,
              s.role AS staff_role,
              s.phone AS staff_phone,
              s.photo_url AS staff_photo_url,
              s.cpr_certificate_id AS staff_cpr_certificate_id
            FROM orders o
            LEFT JOIN staff s ON o.staff_id = s.id
            WHERE (o.staff_id = ? OR o.driver_id = ?)
              AND o.current_status < 6
              AND (o.completed_at IS NULL OR o.completed_at = '')
            ORDER BY o.updated_at DESC
          `,
          args: [staffId, staffId],
        });

        res.status(200).json({
          ok: true,
          staff: staffResult.rows[0],
          activeOrder: ordersResult.rows[0] ?? null,
          orders: ordersResult.rows,
        });
        return;
      }

      if (!isAuthorizedAdmin(req)) {
        res.status(401).json({
          error: 'Unauthorized. Valid admin passcode required.',
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
          o.driver_id,
          o.current_status,
          COALESCE(o.is_b40, 0) AS is_b40,
          o.updated_at,
          o.completed_at,
          CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.name END AS companion_name,
          CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.phone END AS companion_phone,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.name END AS driver_name,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_model END AS driver_vehicle_model,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_plate END AS driver_vehicle_plate
        FROM orders o
        LEFT JOIN staff c ON o.staff_id = c.id
        LEFT JOIN staff d ON o.driver_id = d.id
        ORDER BY o.updated_at DESC
      `);
      res.status(200).json({ ok: true, orders: result.rows });
    } catch (error) {
      console.error('Failed to list orders:', error);
      res.status(500).json({ error: 'Failed to load orders.' });
    }
  });

  app.delete('/api/orders', async (req: Request, res: Response) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        res.status(401).json({
          error: 'Unauthorized. Valid admin passcode required.',
        });
        return;
      }

      const queryOrderId =
        typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';
      const bodyOrderId =
        typeof req.body?.order_id === 'string' ? req.body.order_id.trim() : '';
      const orderId = (queryOrderId || bodyOrderId).replace(/^#/, '').toUpperCase();

      if (!orderId) {
        res.status(400).json({ error: 'Missing required order_id.' });
        return;
      }

      const deleteResult = await db.execute({
        sql: `DELETE FROM orders WHERE UPPER(order_id) = UPPER(?)`,
        args: [orderId],
      });

      if (deleteResult.rowsAffected === 0) {
        res.status(404).json({ error: `Order "${orderId}" not found.` });
        return;
      }

      try {
        await db.execute({
          sql: `DELETE FROM bookings WHERE UPPER(id) = UPPER(?)`,
          args: [orderId],
        });
      } catch {
        // Ignore if no booking record exists
      }

      res.status(200).json({
        ok: true,
        deleted_order_id: orderId,
      });
    } catch (error) {
      console.error('Failed to delete order:', error);
      res.status(500).json({ error: 'Failed to delete order.' });
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
      const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
      const actorId =
        typeof body.actor_id === 'string' && body.actor_id.trim().length > 0
          ? body.actor_id.trim()
          : null;
      const requestedStaffId =
        typeof body.staff_id === 'string' && body.staff_id.trim().length > 0
          ? body.staff_id.trim()
          : null;

      if (!orderId || !Number.isInteger(statusNum) || statusNum < 1 || statusNum > 6) {
        res.status(400).json({
          error: 'Invalid payload. Provide a valid order_id and status (1-6).',
        });
        return;
      }

      const existingOrderRes = await db.execute({
        sql: `SELECT order_id, staff_id, driver_id FROM orders WHERE UPPER(order_id) = UPPER(?) LIMIT 1`,
        args: [orderId],
      });

      if (existingOrderRes.rows.length === 0) {
        res.status(404).json({ error: `Order ${orderId} not found.` });
        return;
      }

      const existingStaffId = String(existingOrderRes.rows[0].staff_id || 'unassigned').trim();
      const existingDriverId = existingOrderRes.rows[0].driver_id
        ? String(existingOrderRes.rows[0].driver_id).trim()
        : null;

      let nextStaffId = existingStaffId;

      if (action === 'release' || requestedStaffId === 'unassigned') {
        nextStaffId = 'unassigned';
      } else if (action === 'claim') {
        const claimer = requestedStaffId || actorId;
        if (!claimer || claimer === 'unassigned') {
          res.status(400).json({ error: 'Valid staff_id is required to claim an order.' });
          return;
        }
        nextStaffId = claimer;
      } else if (actorId) {
        const isCompanion = existingStaffId === actorId;
        const isDriver = Boolean(existingDriverId && existingDriverId === actorId);
        if (!isCompanion && !isDriver && existingStaffId !== 'unassigned') {
          res.status(403).json({
            error: 'You are not assigned as companion or driver for this order.',
          });
          return;
        }
        nextStaffId = existingStaffId;
      } else if (requestedStaffId) {
        const isDriverOnlyCaller =
          Boolean(existingDriverId && requestedStaffId === existingDriverId) &&
          existingStaffId !== requestedStaffId;
        nextStaffId = isDriverOnlyCaller ? existingStaffId : requestedStaffId;
      }

      const assignedDriverId = existingDriverId
        ? existingDriverId
        : await assignAvailableDriver(db);

      const updatedAt = new Date().toISOString();
      const completedAt = statusNum === 6 ? updatedAt : null;
      const result = await db.execute({
        sql: `
          UPDATE orders
          SET current_status = ?, staff_id = ?, driver_id = COALESCE(NULLIF(driver_id, ''), ?), completed_at = ?, updated_at = ?
          WHERE UPPER(order_id) = UPPER(?)
        `,
        args: [statusNum, nextStaffId, assignedDriverId, completedAt, updatedAt, orderId],
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
        staff_id: nextStaffId,
        driver_id: assignedDriverId,
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
            CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.cpr_certificate_id END AS staff_cpr_certificate_id,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN o.driver_id ELSE NULL END AS driver_id,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN d.name ELSE NULL END AS driver_name,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN d.phone ELSE NULL END AS driver_phone,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN d.photo_url ELSE NULL END AS driver_photo_url,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN d.vehicle_model ELSE NULL END AS driver_vehicle_model,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN d.vehicle_color ELSE NULL END AS driver_vehicle_color,
            CASE WHEN d.id IS NOT NULL AND o.driver_id != 'unassigned' THEN d.vehicle_plate ELSE NULL END AS driver_vehicle_plate
          FROM orders o
          LEFT JOIN staff s ON o.staff_id = s.id
          LEFT JOIN staff d ON o.driver_id = d.id
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
