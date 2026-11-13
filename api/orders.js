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
    const result = await db.execute(`
      SELECT
        o.order_id,
        o.client_name,
        o.hospital_name,
        o.current_status,
        o.updated_at,
        s.name AS staff_name
      FROM orders o
      INNER JOIN staff s ON o.staff_id = s.id
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
