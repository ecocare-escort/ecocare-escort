import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    await ensureSchemaAndSeed();

    const { order_id } = req.body || {};
    const orderId = typeof order_id === 'string' ? order_id.trim() : '';

    if (!orderId) {
      return res.status(400).json({ error: 'Provide valid order_id.' });
    }

    const updatedAt = new Date().toISOString();
    const result = await db.execute({
      sql: `
        UPDATE orders
        SET staff_id = 'unassigned', current_status = 1, completed_at = NULL, updated_at = ?
        WHERE UPPER(order_id) = UPPER(?)
      `,
      args: [updatedAt, orderId],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: `Order ${orderId} not found.` });
    }

    return res.status(200).json({ ok: true, order_id: orderId });
  } catch (error) {
    console.error('Error releasing order:', error);
    return res.status(500).json({ error: 'Failed to release order.' });
  }
}
