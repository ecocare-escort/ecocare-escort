-- EcoCare Escorts Turso / libSQL Database Schema

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT,
  cpr_certificate_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  hospital_name TEXT,
  staff_id TEXT NOT NULL,
  current_status INTEGER NOT NULL DEFAULT 1 CHECK (current_status BETWEEN 1 AND 5),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (staff_id) REFERENCES staff(id)
);

-- Seed certified St. John Ambulance companions
INSERT OR IGNORE INTO staff (id, name, photo_url, cpr_certificate_id)
VALUES
  ('staff-mei-ling', 'Mei Ling Tan', '/companions/mei-ling.jpg', 'SJAM-CPR-20489'),
  ('staff-amirul', 'Amirul Hakim', '', 'SJAM-CPR-20514');

-- Seed active sample orders for Employee Portal & Live Tracker
INSERT OR IGNORE INTO orders (order_id, client_name, hospital_name, staff_id, current_status, updated_at)
VALUES
  ('ECE-842190', 'Mdm. Tan Siew Lan', 'Hospital Serdang', 'staff-mei-ling', 3, '2026-11-12T09:05:00.000Z'),
  ('ECE-842205', 'En. Razak Bin Osman', 'Hospital Putrajaya', 'staff-amirul', 2, '2026-11-12T08:40:00.000Z');
