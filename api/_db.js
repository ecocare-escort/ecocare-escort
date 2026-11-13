import { createClient } from '@libsql/client';

const isTursoConfigured = Boolean(
  process.env.TURSO_DATABASE_URL && process.env.TURSO_DATABASE_URL.trim().length > 0
);

export const db = createClient({
  url: isTursoConfigured
    ? process.env.TURSO_DATABASE_URL.trim()
    : 'file:ecocare_bookings.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

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
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  return initPromise;
}
