import { assignAvailableDriver, db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    await ensureSchemaAndSeed();

    let rawBody = req.body;
    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
      }
    }
    const body = rawBody || {};

    const orderId =
      typeof body.order_id === 'string' ? body.order_id.trim().toUpperCase() : '';
    const rawStatus = body.status !== undefined ? body.status : body.current_status;
    const statusNum = Number(rawStatus);
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    const actorId =
      typeof body.actor_id === 'string' && body.actor_id.trim().length > 0
        ? body.actor_id.trim()
        : null;
    const requestedStaffId =
      typeof body.staff_id === 'string' && body.staff_id.trim().length > 0
        ? body.staff_id.trim()
        : null;

    if (!orderId || !Number.isInteger(statusNum) || statusNum < 1 || statusNum > 6) {
      return res.status(400).json({
        error: 'Invalid payload. Provide a valid order_id and status (1-6).',
      });
    }

    const existingOrderRes = await db.execute({
      sql: `SELECT order_id, staff_id, driver_id FROM orders WHERE UPPER(order_id) = UPPER(?) LIMIT 1`,
      args: [orderId],
    });

    if (existingOrderRes.rows.length === 0) {
      return res.status(404).json({ error: `Order ${orderId} not found.` });
    }

    const existingStaffId = String(existingOrderRes.rows[0].staff_id || 'unassigned').trim();
    const existingDriverId = existingOrderRes.rows[0].driver_id
      ? String(existingOrderRes.rows[0].driver_id).trim()
      : null;

    let nextStaffId = existingStaffId;

    if (action === 'release' || requestedStaffId === 'unassigned') {
      nextStaffId = 'unassigned';
    } else if (action === 'claim') {
      const claimer = requestedStaffId || actorId;
      if (!claimer || claimer === 'unassigned') {
        return res.status(400).json({ error: 'Valid staff_id is required to claim an order.' });
      }
      nextStaffId = claimer;
    } else if (actorId) {
      const isCompanion = existingStaffId === actorId;
      const isDriver = Boolean(existingDriverId && existingDriverId === actorId);
      if (!isCompanion && !isDriver && existingStaffId !== 'unassigned') {
        return res.status(403).json({
          error: 'You are not assigned as companion or driver for this order.',
        });
      }
      // Preserve existing staff_id when a driver updates status (never overwrite staff_id)
      nextStaffId = existingStaffId;
    } else if (requestedStaffId) {
      const isDriverOnlyCaller =
        Boolean(existingDriverId && requestedStaffId === existingDriverId) &&
        existingStaffId !== requestedStaffId;
      nextStaffId = isDriverOnlyCaller ? existingStaffId : requestedStaffId;
    }

    const assignedDriverId = existingDriverId
      ? existingDriverId
      : await assignAvailableDriver(db);

    const updatedAt = new Date().toISOString();
    const completedAt = statusNum === 6 ? updatedAt : null;

    const result = await db.execute({
      sql: `
        UPDATE orders
        SET current_status = ?, staff_id = ?, driver_id = COALESCE(NULLIF(driver_id, ''), ?), completed_at = ?, updated_at = ?
        WHERE UPPER(order_id) = UPPER(?)
      `,
      args: [statusNum, nextStaffId, assignedDriverId, completedAt, updatedAt, orderId],
    });

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: `Order ${orderId} not found.` });
    }

    return res.status(200).json({
      ok: true,
      order_id: orderId,
      current_status: statusNum,
      status: statusNum,
      staff_id: nextStaffId,
      driver_id: assignedDriverId,
      updated_at: updatedAt,
      completed_at: completedAt,
    });
  } catch (error) {
    console.error('Error updating order status in Turso:', error);
    return res.status(500).json({ error: 'Failed to update order status in Turso.' });
  }
}
