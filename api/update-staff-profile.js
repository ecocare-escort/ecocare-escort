import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    await ensureSchemaAndSeed();

    const { id, name, phone, photo_url, cpr_certificate_id } = req.body || {};
    const staffId = typeof id === 'string' ? id.trim() : '';
    const fullName = typeof name === 'string' ? name.trim() : '';
    const phoneNumber = typeof phone === 'string' ? phone.trim() : '';
    const photoUrl = typeof photo_url === 'string' ? photo_url.trim() : '';
    const cprId =
      typeof cpr_certificate_id === 'string' ? cpr_certificate_id.trim() : '';

    if (!staffId || !fullName || !cprId) {
      return res.status(400).json({
        error: 'Staff ID, full name, and CPR Certificate ID are required.',
      });
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
      return res.status(404).json({ error: `Staff member ${staffId} not found.` });
    }

    return res.status(200).json({
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
    console.error('Error updating staff profile:', error);
    return res.status(500).json({ error: 'Failed to update staff profile.' });
  }
}
