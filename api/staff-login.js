import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    await ensureSchemaAndSeed();

    let rawBody = req.body;
    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
      }
    }
    const body = rawBody || {};

    const loginId = String(body.login_id ?? body.username ?? '').trim();
    const passcode = String(body.passcode ?? body.password ?? '').trim();

    if (!loginId || !passcode) {
      return res.status(400).json({
        error: 'Please enter your Login ID and passcode.',
      });
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
      return res.status(401).json({ error: 'Invalid Login ID or passcode.' });
    }

    const staff = result.rows[0];

    return res.status(200).json({
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
    console.error('Error in /api/staff-login:', error);
    return res.status(500).json({ error: 'Failed to verify staff credentials in Turso.' });
  }
}
