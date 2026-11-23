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

    const loginId = String(body.login_id ?? body.username ?? '').trim().toLowerCase();
    const staffId = String(body.staff_id ?? '').trim();
    const passcode = String(body.passcode ?? body.password ?? '').trim();

    if ((!loginId && !staffId) || !passcode) {
      return res.status(400).json({
        error: 'Please enter your Login ID and Passcode.',
      });
    }

    const result = staffId
      ? await db.execute({
          sql: `
            SELECT id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode
            FROM staff
            WHERE id = ? AND id != 'unassigned'
            LIMIT 1
          `,
          args: [staffId],
        })
      : await db.execute({
          sql: `
            SELECT id, name, role, phone, photo_url, cpr_certificate_id, login_id, passcode
            FROM staff
            WHERE LOWER(login_id) = LOWER(?) AND id != 'unassigned'
            LIMIT 1
          `,
          args: [loginId],
        });

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid Staff Login ID or Passcode.' });
    }

    const staff = result.rows[0];
    const storedPasscode = String(staff.passcode || '123456').trim();

    if (passcode !== storedPasscode) {
      return res.status(401).json({ error: 'Invalid Staff Login ID or Passcode.' });
    }

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
      },
    });
  } catch (error) {
    console.error('Error in /api/staff-login:', error);
    return res.status(500).json({ error: 'Failed to verify staff credentials in Turso.' });
  }
}
