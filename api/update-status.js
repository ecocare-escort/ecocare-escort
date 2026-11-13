import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:ecocare_bookings.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { order_id, current_status } = req.body || {};
    const orderId = typeof order_id === 'string' ? order_id.trim() : '';
    const statusNum = Number(current_status);

    if (!orderId || !Number.isInteger(statusNum) || statusNum < 1 || statusNum > 6) {
      return res.status(400).json({
        error: 'Invalid payload. Provide a valid order_id and current_status (1-6).',
      });
    }

    const updatedAt = new Date().toISOString();

    const result = await db.execute({
      sql: `
        UPDATE orders
        SET current_status = ?, updated_at = ?
        WHERE order_id = ?
      `,
      args: [statusNum, updatedAt, orderId],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: `Order ${orderId} not found.` });
    }

    return res.status(200).json({
      ok: true,
      order_id: orderId,
      current_status: statusNum,
      updated_at: updatedAt,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Failed to update order status in Turso.' });
  }
}
