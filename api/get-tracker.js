import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:ecocare_bookings.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const orderId =
      typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';

    if (!orderId) {
      return res.status(400).json({ error: 'Missing required order_id query parameter.' });
    }

    const result = await db.execute({
      sql: `
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          o.current_status,
          o.updated_at,
          s.id AS staff_id,
          s.name AS staff_name,
          s.photo_url AS staff_photo_url,
          s.cpr_certificate_id AS staff_cpr_certificate_id
        FROM orders o
        INNER JOIN staff s ON o.staff_id = s.id
        WHERE o.order_id = ?
        LIMIT 1
      `,
      args: [orderId],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Order ${orderId} not found.` });
    }

    return res.status(200).json({
      ok: true,
      tracker: result.rows[0],
    });
  } catch (error) {
    console.error('Error fetching tracker data:', error);
    return res.status(500).json({ error: 'Failed to load tracker data from Turso.' });
  }
}
