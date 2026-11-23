import { db, ensureSchemaAndSeed } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    await ensureSchemaAndSeed();

    const staffId =
      typeof req.query?.staff_id === 'string' ? req.query.staff_id.trim() : '';

    if (!staffId || staffId === 'unassigned') {
      return res.status(400).json({ error: 'Missing required staff_id query parameter.' });
    }

    const staffResult = await db.execute({
      sql: `
        SELECT
          id,
          name,
          role,
          phone,
          photo_url,
          cpr_certificate_id,
          login_id,
          COALESCE(is_driver, 0) AS is_driver,
          vehicle_model,
          vehicle_color,
          vehicle_plate
        FROM staff
        WHERE id = ? AND id != 'unassigned'
        LIMIT 1
      `,
      args: [staffId],
    });

    if (staffResult.rows.length === 0) {
      return res.status(404).json({ error: `Staff member "${staffId}" not found.` });
    }

    const myOrdersResult = await db.execute({
      sql: `
        SELECT
          o.order_id,
          o.client_name,
          o.hospital_name,
          COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
          o.staff_id,
          o.driver_id,
          o.current_status,
          o.updated_at,
          CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.name END AS companion_name,
          CASE WHEN o.staff_id = 'unassigned' OR c.id IS NULL THEN NULL ELSE c.phone END AS companion_phone,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.name END AS driver_name,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.phone END AS driver_phone,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_model END AS driver_vehicle_model,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_color END AS driver_vehicle_color,
          CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_plate END AS driver_vehicle_plate
        FROM orders o
        LEFT JOIN staff c ON o.staff_id = c.id
        LEFT JOIN staff d ON o.driver_id = d.id
        WHERE (o.staff_id = ? OR o.driver_id = ?)
          AND o.current_status < 6
          AND (o.completed_at IS NULL OR o.completed_at = '')
        ORDER BY o.updated_at DESC
      `,
      args: [staffId, staffId],
    });

    const pendingOrdersResult = await db.execute(`
      SELECT
        o.order_id,
        o.client_name,
        o.hospital_name,
        COALESCE(NULLIF(o.pickup_time, ''), '09:00 AM') AS pickup_time,
        o.staff_id,
        o.driver_id,
        o.current_status,
        o.updated_at,
        CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.name END AS driver_name,
        CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_model END AS driver_vehicle_model,
        CASE WHEN o.driver_id IS NULL OR o.driver_id = 'unassigned' OR d.id IS NULL THEN NULL ELSE d.vehicle_plate END AS driver_vehicle_plate
      FROM orders o
      LEFT JOIN staff d ON o.driver_id = d.id
      WHERE o.staff_id = 'unassigned'
        AND o.current_status < 6
        AND (o.completed_at IS NULL OR o.completed_at = '')
      ORDER BY o.updated_at DESC
    `);

    const staffRow = staffResult.rows[0];

    return res.status(200).json({
      ok: true,
      staff: {
        ...staffRow,
        is_driver: Number(staffRow.is_driver || 0),
      },
      myOrders: myOrdersResult.rows,
      pendingOrders: pendingOrdersResult.rows,
    });
  } catch (error) {
    console.error('Error in /api/staff-orders:', error);
    return res.status(500).json({ error: 'Failed to load staff orders from Turso.' });
  }
}
