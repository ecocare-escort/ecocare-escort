-- EcoCare Escorts Turso / libSQL Database Schema

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Care Companion',
  phone TEXT NOT NULL DEFAULT '+60 12-345 6789',
  photo_url TEXT,
  cpr_certificate_id TEXT NOT NULL
);

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
);

-- Seed certified St. John Ambulance companions + unassigned pool sentinel
INSERT OR IGNORE INTO staff (id, name, role, phone, photo_url, cpr_certificate_id)
VALUES
  ('unassigned', 'Pending Dispatch', 'Unassigned', '', '', 'PENDING'),
  ('staff-dong-hao', 'Dong Hao', 'Senior Care Companion', '+60 12-345 6789', 'https://ui-avatars.com/api/?name=Dong+Hao&background=047857&color=ffffff&bold=true', 'SJAM-CPR-20612'),
  ('staff-yenchi', 'Yenchi', 'Care Companion', '+60 12-678 9012', 'https://ui-avatars.com/api/?name=Yenchi&background=0f766e&color=ffffff&bold=true', 'SJAM-CPR-20705'),
  ('staff-mei-ling', 'Mei Ling Tan', 'Senior Care Companion', '+60 12-456 7890', 'https://ui-avatars.com/api/?name=Mei+Ling+Tan&background=047857&color=ffffff&bold=true', 'SJAM-CPR-20489'),
  ('staff-amirul', 'Amirul Hakim', 'Care Companion', '+60 12-890 1234', 'https://ui-avatars.com/api/?name=Amirul+Hakim&background=0f766e&color=ffffff&bold=true', 'SJAM-CPR-20514');

-- Seed pending paid orders (unassigned) and active sample orders
INSERT OR IGNORE INTO orders (order_id, client_name, hospital_name, pickup_time, staff_id, current_status, updated_at)
VALUES
  ('ECE-8421', 'Mdm. Tan Siew Lan', 'Hospital Serdang', '09:00 AM', 'unassigned', 1, '2026-11-12T08:00:00.000Z'),
  ('ECE-8425', 'En. Ahmad Zaki', 'Hospital Putrajaya', '10:30 AM', 'unassigned', 1, '2026-11-12T08:15:00.000Z'),
  ('ECE-8430', 'Mdm. Lim Poh Choo', 'UMMC', '11:15 AM', 'unassigned', 1, '2026-11-12T08:25:00.000Z'),
  ('ECE-842190', 'Mdm. Tan Siew Lan', 'Hospital Serdang', '09:00 AM', 'staff-mei-ling', 3, '2026-11-12T09:05:00.000Z'),
  ('ECE-842205', 'En. Razak Bin Osman', 'Hospital Putrajaya', '08:30 AM', 'staff-amirul', 2, '2026-11-12T08:40:00.000Z');
