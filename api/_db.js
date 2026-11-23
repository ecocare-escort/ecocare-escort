import 'dotenv/config';
import { createClient } from '@libsql/client';

export const isTursoConfigured = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim().length > 0
);

export const db = createClient({
  url: isTursoConfigured
    ? process.env.TURSO_DATABASE_URL.trim()
    : 'file:ecocare_bookings.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export function formatMalaysiaPhone(input) {
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

  // 11-digit mobile numbers (011 / 015 -> 10 digits after +60)
  if ((local.startsWith('11') || local.startsWith('15')) && local.length === 10) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6, 10)}`;
  }

  // Standard 10-digit mobile numbers (e.g., 012-345 6789 -> 9 digits after +60)
  if (local.startsWith('1') && local.length === 9) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 5)} ${local.slice(5, 9)}`;
  }

  // Fallback for other 10-digit mobile lengths starting with 1
  if (local.startsWith('1') && local.length === 10) {
    return `+60 ${local.slice(0, 2)}-${local.slice(2, 6)} ${local.slice(6, 10)}`;
  }

  // Klang Valley landline (03-XXXX XXXX)
  if (local.startsWith('3') && local.length === 9) {
    return `+60 ${local.slice(0, 1)}-${local.slice(1, 5)} ${local.slice(5, 9)}`;
  }

  return raw;
}

const DEFAULT_LOGIN_IDS = {
  unassigned: 'unassigned',
  'staff-dong-hao': 'donghao',
  'staff-yenchi': 'yenchi',
  'staff-mei-ling': 'meiling',
  'staff-amirul': 'amirul',
};

let initPromise = null;

export async function ensureSchemaAndSeed() {
  if (!initPromise) {
    initPromise = (async () => {
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

      // Safely add missing columns to existing Turso tables without dropping data
      const staffAlterStatements = [
        `ALTER TABLE staff ADD COLUMN role TEXT NOT NULL DEFAULT 'Care Companion'`,
        `ALTER TABLE staff ADD COLUMN phone TEXT NOT NULL DEFAULT '+60 12-345 6789'`,
        `ALTER TABLE staff ADD COLUMN login_id TEXT`,
        `ALTER TABLE staff ADD COLUMN passcode TEXT DEFAULT '123456'`,
        `ALTER TABLE staff ADD COLUMN is_driver INTEGER DEFAULT 0`,
        `ALTER TABLE staff ADD COLUMN vehicle_model TEXT`,
        `ALTER TABLE staff ADD COLUMN vehicle_color TEXT`,
        `ALTER TABLE staff ADD COLUMN vehicle_plate TEXT`,
      ];
      for (const sql of staffAlterStatements) {
        try {
          await db.execute(sql);
        } catch {
          // Column already exists
        }
      }

      const orderAlterStatements = [
        `ALTER TABLE orders ADD COLUMN hospital_name TEXT`,
        `ALTER TABLE orders ADD COLUMN pickup_time TEXT`,
        `ALTER TABLE orders ADD COLUMN completed_at TEXT`,
        `ALTER TABLE orders ADD COLUMN driver_id TEXT`,
        `ALTER TABLE orders ADD COLUMN is_b40 INTEGER DEFAULT 0`,
      ];
      for (const sql of orderAlterStatements) {
        try {
          await db.execute(sql);
        } catch {
          // Column already exists
        }
      }

      const bookingAlterStatements = [
        `ALTER TABLE bookings ADD COLUMN pickup_zone TEXT DEFAULT 'serdang'`,
        `ALTER TABLE bookings ADD COLUMN distance_km INTEGER DEFAULT 0`,
        `ALTER TABLE bookings ADD COLUMN mileage_fee INTEGER DEFAULT 0`,
        `ALTER TABLE bookings ADD COLUMN is_b40 INTEGER DEFAULT 0`,
      ];
      for (const sql of bookingAlterStatements) {
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

      // Backfill existing staff rows that have NULL/empty login_id or passcode
      const existingStaff = await db.execute(
        `SELECT id, name, login_id, passcode FROM staff`
      );
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
          const nextLogin = currentLogin || fallbackSlug;
          const nextPasscode = currentPasscode || '123456';
          await db.execute({
            sql: `UPDATE staff SET login_id = ?, passcode = ? WHERE id = ?`,
            args: [nextLogin, nextPasscode, id],
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
        const ordersCountResult = await db.execute(
          `SELECT COUNT(*) AS count FROM orders`
        );
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
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  return initPromise;
}

export async function assignAvailableDriver(dbClient = db) {
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

export async function getNextOrderId(dbClient = db) {
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
