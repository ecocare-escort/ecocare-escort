import { db, ensureSchemaAndSeed } from './_db.js';

function getExpectedAdminPasscode() {
  return (process.env.ADMIN_PASSCODE || 'ecocare2026').trim();
}

function getProvidedPasscode(req) {
  const headerVal = req.headers?.['x-admin-passcode'];
  if (Array.isArray(headerVal)) return String(headerVal[0] || '').trim();
  return typeof headerVal === 'string' ? headerVal.trim() : '';
}

function isAuthorizedAdmin(req) {
  const provided = getProvidedPasscode(req);
  return provided.length > 0 && provided === getExpectedAdminPasscode();
}

function parseBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody);
    } catch {
      return null;
    }
  }
  return rawBody;
}

export default async function handler(req, res) {
  try {
    await ensureSchemaAndSeed();

    if (req.method === 'GET') {
      const staffId =
        typeof req.query?.staff_id === 'string' ? req.query.staff_id.trim() : '';

      // Employee Portal lookup for a specific companion's active order
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

      // Admin Order Management & Live Progress Monitor (all orders)
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({
          error: 'Unauthorized. Valid admin passcode required.',
        });
      }

      const result = await db.execute(`
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
          o.staff_id,
          o.driver_id,
          o.current_status,
          o.updated_at,
          o.completed_at,
          CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.name END AS companion_name,
          CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.phone END AS companion_phone,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.name END AS driver_name,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_model END AS driver_vehicle_model,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_plate END AS driver_vehicle_plate
        FROM orders o
        LEFT JOIN staff c ON o.staff_id = c.id
        LEFT JOIN staff d ON o.driver_id = d.id
        ORDER BY o.updated_at DESC
      `);

      return res.status(200).json({
        ok: true,
        orders: result.rows,
      });
    }

    if (req.method === 'DELETE') {
      if (!isAuthorizedAdmin(req)) {
        return res.status(401).json({
          error: 'Unauthorized. Valid admin passcode required.',
        });
      }

      const body = parseBody(req.body);
      if (body === null) {
        return res.status(400).json({ error: 'Invalid JSON payload.' });
      }

      const queryOrderId =
        typeof req.query?.order_id === 'string' ? req.query.order_id.trim() : '';
      const bodyOrderId =
        typeof body?.order_id === 'string' ? body.order_id.trim() : '';
      const orderId = (queryOrderId || bodyOrderId).replace(/^#/, '').toUpperCase();

      if (!orderId) {
        return res.status(400).json({ error: 'Missing required order_id.' });
      }

      const deleteResult = await db.execute({
        sql: `DELETE FROM orders WHERE UPPER(order_id) = UPPER(?)`,
        args: [orderId],
      });

      if (deleteResult.rowsAffected === 0) {
        return res.status(404).json({ error: `Order "${orderId}" not found.` });
      }

      // Best-effort cleanup of matching booking record if present
      try {
        await db.execute({
          sql: `DELETE FROM bookings WHERE UPPER(id) = UPPER(?)`,
          args: [orderId],
        });
      } catch {
        // Ignore if bookings row didn't exist for seeded order
      }

      return res.status(200).json({
        ok: true,
        deleted_order_id: orderId,
      });
    }

    return res.status(405).json({ error: 'Method not allowed. Use GET or DELETE.' });
  } catch (error) {
    console.error('Error in /api/orders:', error);
    return res.status(500).json({ error: 'Failed to process orders request in Turso.' });
  }
}
