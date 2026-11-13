import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    await ensureSchemaAndSeed();

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
  } catch (error) {
    console.error('Error listing staff:', error);
    return res.status(500).json({ error: 'Failed to load staff directory.' });
  }
}
