import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    await ensureSchemaAndSeed();

    const staffId =
      typeof req.query?.staff_id === 'string' ? req.query.staff_id.trim() : '';

    if (staffId) {
      const staffResult = await db.execute({
        sql: `
          SELECT id, name, role, phone, photo_url, cpr_certificate_id
          FROM staff
          WHERE id = ?
          LIMIT 1
        `,
        args: [staffId],
      });

      if (staffResult.rows.length === 0) {
        return res.status(404).json({ error: `Staff member "${staffId}" not found.` });
      }

      const ordersResult = await db.execute({
        sql: `
          SELECT
            o.order_id,
            o.client_name,
            o.hospital_name,
            COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
            o.staff_id,
            o.current_status,
            o.updated_at,
            s.name AS staff_name,
            s.role AS staff_role,
            s.phone AS staff_phone,
            s.photo_url AS staff_photo_url,
            s.cpr_certificate_id AS staff_cpr_certificate_id
          FROM orders o
          INNER JOIN staff s ON o.staff_id = s.id
          WHERE o.staff_id = ?
            AND (o.completed_at IS NULL OR o.completed_at = '')
          ORDER BY o.updated_at DESC
        `,
        args: [staffId],
      });

      return res.status(200).json({
        ok: true,
        staff: staffResult.rows[0],
        activeOrder: ordersResult.rows[0] ?? null,
        orders: ordersResult.rows,
      });
    }

    const result = await db.execute(`
      SELECT
        o.order_id,
        o.client_name,
        o.hospital_name,
        COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
        o.staff_id,
        o.current_status,
        o.updated_at,
        s.name AS staff_name,
        s.role AS staff_role,
        s.phone AS staff_phone
      FROM orders o
      INNER JOIN staff s ON o.staff_id = s.id
      WHERE o.staff_id != 'unassigned'
      ORDER BY o.updated_at DESC
    `);

    return res.status(200).json({
      ok: true,
      orders: result.rows,
    });
  } catch (error) {
    console.error('Error listing orders:', error);
    return res.status(500).json({ error: 'Failed to load active orders.' });
  }
}
