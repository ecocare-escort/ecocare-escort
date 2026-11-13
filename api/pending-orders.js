import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    await ensureSchemaAndSeed();

    const result = await db.execute(`
      SELECT
        order_id,
        client_name,
        hospital_name,
        COALESCE(NULLIF(pickup_time, ''), '09:00 AM') AS pickup_time,
        staff_id,
        current_status,
        updated_at
      FROM orders
      WHERE staff_id = 'unassigned'
        AND (completed_at IS NULL OR completed_at = '')
      ORDER BY updated_at DESC
    `);

    return res.status(200).json({
      ok: true,
      pendingOrders: result.rows,
    });
  } catch (error) {
    console.error('Error listing pending orders:', error);
    return res.status(500).json({ error: 'Failed to load pending orders.' });
  }
}
