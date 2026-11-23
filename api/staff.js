import { db, ensureSchemaAndSeed } from './_db.js';

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

export default async function handler(req, res) {
  try {
    await ensureSchemaAndSeed();

    if (req.method === 'GET') {
      if (req.query?.verify === '1' && !isAuthorizedAdmin(req)) {
        return res.status(401).json({ error: 'Invalid admin passcode.' });
      }

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
      const phone = String(body.phone ?? '').trim();
      const cprCertificateId = String(body.cpr_certificate_id ?? '').trim();

      if (!name || !phone || !cprCertificateId) {
        return res.status(400).json({
          error: 'Full Name, Phone, and CPR Certificate ID are required.',
        });
      }

      const staffId = generateStaffId(name);
      const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
      )}&background=047857&color=ffffff&bold=true`;

      await db.execute({
        sql: `
          INSERT INTO staff (id, name, role, phone, photo_url, cpr_certificate_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        args: [staffId, name, role, phone, photoUrl, cprCertificateId],
      });

      return res.status(201).json({
        ok: true,
        staff: {
          id: staffId,
          name,
          role,
          phone,
          photo_url: photoUrl,
          cpr_certificate_id: cprCertificateId,
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

    return res.status(405).json({ error: 'Method not allowed. Use GET, POST, or DELETE.' });
  } catch (error) {
    console.error('Error in /api/staff:', error);
    return res.status(500).json({ error: 'Failed to process staff request in Turso.' });
  }
}
