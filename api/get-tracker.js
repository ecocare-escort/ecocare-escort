import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    await ensureSchemaAndSeed();

    const rawOrderId =
      typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';

    if (!rawOrderId) {
      return res.status(400).json({ error: 'Missing required order_id query parameter.' });
    }

    const normalizedOrderId = rawOrderId.replace(/^#/, '').toUpperCase();

    const result = await db.execute({
      sql: `
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
          o.current_status,
          o.updated_at,
          o.completed_at,
          CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE o.staff_id END AS staff_id,
          CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.name END AS staff_name,
          CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.role END AS staff_role,
          CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.phone END AS staff_phone,
          CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.photo_url END AS staff_photo_url,
          CASE WHEN o.staff_id = 'unassigned' THEN NULL ELSE s.cpr_certificate_id END AS staff_cpr_certificate_id
        FROM orders o
        LEFT JOIN staff s ON o.staff_id = s.id
        WHERE UPPER(o.order_id) = UPPER(?)
        LIMIT 1
      `,
      args: [normalizedOrderId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Order ${rawOrderId} not found.` });
    }

    return res.status(200).json({
      ok: true,
      tracker: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching tracker data from Turso:', error);
    return res.status(500).json({ error: 'Failed to load tracker data from Turso.' });
  }
}
