import { db, ensureSchemaAndSeed, formatMalaysiaPhone } from './_db.js';

function getExpectedAdminPasscode() {
  return (process.env.ADMIN_PASSCODE || 'ecocare2026').trim();
}

function getProvidedPasscode(req) {
  const headerVal = req.headers?.['x-admin-passcode'];
  if (Array.isArray(headerVal)) return String(headerVal[0] || '').trim();
  return typeof headerVal === 'string' ? headerVal.trim() : '';
}

function isAuthorizedAdmin(req) {
  const provided = getProvidedPasscode(req);
  return provided.length > 0 && provided === getExpectedAdminPasscode();
}

function parseBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  }
  return rawBody;
}

function generateStaffId(name) {
  const slug = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const digits = Math.floor(100 + Math.random() * 900);
  return `staff-${slug || 'companion'}-${digits}`;
}

function normalizeLoginId(input, fallbackName) {
  const raw = String(input || '').trim().toLowerCase().replace(/\s+/g, '');
  if (raw) {
    return raw.replace(/[^a-z0-9._-]/g, '');
  }
  const fromName = String(fallbackName || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24);
  return fromName || `companion${Math.floor(100 + Math.random() * 900)}`;
}

function defaultAvatarUrl(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name
  )}&background=047857&color=ffffff&bold=true`;
}

export default async function handler(req, res) {
  try {
    await ensureSchemaAndSeed();

    if (req.method === 'GET') {
      const adminVerified = isAuthorizedAdmin(req);
      if (req.query?.verify === '1' && !adminVerified) {
        return res.status(401).json({ error: 'Invalid admin passcode.' });
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

      return res.status(200).json({
        ok: true,
        staff: result.rows,
      });
    }

    if (req.method === 'POST') {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized. Valid admin passcode required.' });
      }

      const body = parseBody(req.body);
      if (!body) {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
      }

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
        return res.status(400).json({
          error: 'Full Name, Phone, and CPR Certificate ID are required.',
        });
      }

      if (isDriver && (!vehicleModel || !vehiclePlate)) {
        return res.status(400).json({
          error: 'Vehicle Model and Plate Number are required for designated drivers.',
        });
      }

      let loginId = normalizeLoginId(requestedLoginId, name);
      const conflictCheck = await db.execute({
        sql: `SELECT id FROM staff WHERE LOWER(login_id) = LOWER(?) LIMIT 1`,
        args: [loginId],
      });

      if (conflictCheck.rows.length > 0) {
        if (requestedLoginId) {
          return res.status(409).json({
            error: `Login ID "${loginId}" is already assigned to another staff member.`,
          });
        }
        loginId = `${loginId}${Math.floor(10 + Math.random() * 90)}`;
      }

      const staffId = generateStaffId(name);
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

      return res.status(201).json({
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
    }

    if (req.method === 'PUT') {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized. Valid admin passcode required.' });
      }

      const body = parseBody(req.body);
      if (!body) {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
      }

      const staffId = String(body.id ?? '').trim();
      if (!staffId) {
        return res.status(400).json({ error: 'Missing required staff id.' });
      }
      if (staffId === 'unassigned') {
        return res.status(400).json({
          error: "Cannot modify the system 'unassigned' dispatch record.",
        });
      }

      const existingRes = await db.execute({
        sql: `SELECT id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode, COALESCE(is_driver, 0) AS is_driver, vehicle_model, vehicle_color, vehicle_plate FROM staff WHERE id = ? LIMIT 1`,
        args: [staffId],
      });
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: `Staff member "${staffId}" not found.` });
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
        return res.status(400).json({
          error: 'Full Name, Phone, CPR Certificate ID, and Login ID are required.',
        });
      }

      if (nextIsDriver && (!nextVehicleModel || !nextVehiclePlate)) {
        return res.status(400).json({
          error: 'Vehicle Model and Plate Number are required for designated drivers.',
        });
      }

      const loginConflict = await db.execute({
        sql: `SELECT id FROM staff WHERE LOWER(login_id) = LOWER(?) AND id != ? LIMIT 1`,
        args: [nextLoginId, staffId],
      });
      if (loginConflict.rows.length > 0) {
        return res.status(409).json({
          error: `Login ID "${nextLoginId}" is already used by another staff member.`,
        });
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

      return res.status(200).json({
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
    }

    if (req.method === 'DELETE') {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: 'Unauthorized. Valid admin passcode required.' });
      }

      const body = parseBody(req.body) || {};
      const queryId =
        typeof req.query?.id === 'string' ? req.query.id.trim() : '';
      const bodyId = typeof body.id === 'string' ? body.id.trim() : '';
      const staffId = queryId || bodyId;

      if (!staffId) {
        return res.status(400).json({ error: 'Missing required staff id.' });
      }

      if (staffId === 'unassigned') {
        return res.status(400).json({
          error: "Cannot delete the system 'unassigned' dispatch record.",
        });
      }

      // Foreign key safety: reassign any past/active orders before removing staff row
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
        return res.status(404).json({ error: `Staff member "${staffId}" not found.` });
      }

      return res.status(200).json({
        ok: true,
        deletedId: staffId,
      });
    }

    return res.status(405).json({ error: 'Method not allowed. Use GET, POST, PUT, or DELETE.' });
  } catch (error) {
    console.error('Error in /api/staff:', error);
    return res.status(500).json({ error: 'Failed to process staff request in Turso.' });
  }
}
