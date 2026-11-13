import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    await ensureSchemaAndSeed();

    const { order_id, staff_id } = req.body || {};
    const orderId = typeof order_id === 'string' ? order_id.trim() : '';
    const staffId = typeof staff_id === 'string' ? staff_id.trim() : '';

    if (!orderId || !staffId || staffId === 'unassigned') {
      return res.status(400).json({ error: 'Provide valid order_id and staff_id.' });
    }

    const updatedAt = new Date().toISOString();
    const result = await db.execute({
      sql: `
        UPDATE orders
        SET staff_id = ?, current_status = 1, completed_at = NULL, updated_at = ?
        WHERE UPPER(order_id) = UPPER(?)
      `,
      args: [staffId, updatedAt, orderId],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: `Order ${orderId} not found.` });
    }

    const orderRes = await db.execute({
      sql: `
        SELECT
          order_id,
          client_name,
          hospital_name,
          COALESCE(NULLIF(pickup_time, ''), '09:00 AM') AS pickup_time,
          staff_id,
          current_status,
          updated_at
        FROM orders
        WHERE UPPER(order_id) = UPPER(?)
        LIMIT 1
      `,
      args: [orderId],
    });

    return res.status(200).json({ ok: true, order: orderRes.rows[0] });
  } catch (error) {
    console.error('Error claiming order:', error);
    return res.status(500).json({ error: 'Failed to claim order.' });
  }
}
