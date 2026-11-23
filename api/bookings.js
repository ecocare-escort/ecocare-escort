import { assignAvailableDriver, db, ensureSchemaAndSeed, isTursoConfigured } from './_db.js';

async function generateUniqueOrderId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `ECE-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await db.execute({
      sql: 'SELECT order_id FROM orders WHERE UPPER(order_id) = UPPER(?) LIMIT 1',
      args: [candidate],
    });
    if (existing.rows.length === 0) {
      return candidate;
    }
  }
  return `ECE-${Math.floor(100000 + Math.random() * 900000)}`;
}

export default async function handler(req, res) {
  try {
    await ensureSchemaAndSeed();

    if (req.method === 'GET') {
      const result = await db.execute(
        'SELECT id, patient_name, hospital_name, tier_id, addons_json, pickup_zone, distance_km, mileage_fee, total_price, appointment_date, pickup_time, created_at FROM bookings ORDER BY created_at DESC LIMIT 20'
      );
      return res.status(200).json({ ok: true, bookings: result.rows });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    let rawBody = req.body;
    if (typeof rawBody === 'string') {
      try {
        rawBody = JSON.parse(rawBody);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request body.' });
      }
    }
    const body = rawBody || {};

    const patientName = String(body.patientName ?? body.patient_name ?? '').trim();
    const hospitalName = String(body.hospitalName ?? body.hospital_name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const rawTier = String(body.tierId ?? body.tier_id ?? body.package ?? 'tier1').trim().toLowerCase();
    const tierId = rawTier === 'tier2' ? 'tier2' : 'tier1';
    const needsWheelchair = Boolean(body.needsWheelchair ?? body.needs_wheelchair);
    const needsFastingMeal = Boolean(body.needsFastingMeal ?? body.needs_fasting_meal);

    const rawPickupZone = String(body.pickupZone ?? body.pickup_zone ?? 'serdang').trim().toLowerCase();
    const pickupZone = rawPickupZone === 'other' ? 'other' : 'serdang';
    const parsedDistance = Number(body.distanceKm ?? body.distance_km ?? (pickupZone === 'other' ? 15 : 0));
    const distanceKm =
      pickupZone === 'other'
        ? Math.max(11, Math.round(Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : 15))
        : 0;
    const extraKm = pickupZone === 'other' ? Math.max(0, distanceKm - 10) : 0;
    const mileageFee = extraKm * 2;

    if (!patientName || !hospitalName) {
      return res.status(400).json({
        error: 'Patient or caregiver name and hospital name are required.',
      });
    }

    const basePrice = tierId === 'tier2' ? 200 : 150;
    const tierLabel =
      tierId === 'tier2'
        ? 'Premium Proxy Package - RM 200'
        : 'Basic Care Package - RM 150';

    const addons = [];
    if (needsWheelchair) {
      addons.push({ id: 'wheelchair', label: 'Wheelchair Provision', price: 15 });
    }
    if (needsFastingMeal) {
      addons.push({ id: 'fasting_meal', label: 'Post-blood Test Meal Run', price: 10 });
    }

    const addonsTotal = addons.reduce((sum, item) => sum + item.price, 0);
    const totalPrice = basePrice + addonsTotal + mileageFee;

    const orderId = await generateUniqueOrderId();
    const createdAt = new Date().toISOString();
    const addonSummary =
      addons.length > 0
        ? addons.map((a) => `${a.label} (+RM ${a.price})`).join(', ')
        : 'None';

    const mileageSummary =
      pickupZone === 'other'
        ? `Other Klang Valley (${distanceKm} km, ${extraKm} km x RM 2 = +RM ${mileageFee})`
        : 'Serdang Free Zone (<= 10 km, RM 0)';

    const dateText = String(body.appointmentDate ?? body.appointment_date ?? '').trim() || 'TBD';
    const timeText = String(body.pickupTime ?? body.pickup_time ?? '').trim() || 'TBD';
    const notesText = String(body.notes ?? '').trim();

    const whatsappMessage = `[EcoCare Escorts Booking Confirmation] Order ${orderId} | Name: ${patientName} | Hospital: ${hospitalName} | Schedule: ${dateText} at ${timeText} | Package: ${tierLabel} | Add-ons: ${addonSummary} | Mileage: ${mileageSummary} | Total Price: RM ${totalPrice}. Our Serdang student care team will confirm your companion details via WhatsApp (+60 12-345 6789) within 30 minutes.`;

    await db.execute({
      sql: `
        INSERT INTO bookings (
          id, patient_name, hospital_name, email, phone,
          tier_id, tier_label, base_price, addons_json, pickup_zone, distance_km, mileage_fee, total_price,
          appointment_date, pickup_time, notes, whatsapp_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        orderId,
        patientName,
        hospitalName,
        email,
        phone,
        tierId,
        tierLabel,
        basePrice,
        JSON.stringify(addons),
        pickupZone,
        distanceKm,
        mileageFee,
        totalPrice,
        dateText,
        timeText,
        notesText,
        whatsappMessage,
        createdAt,
      ],
    });

    const assignedDriverId = await assignAvailableDriver(db);

    // Insert as an unassigned pending order (status 1) with auto-dispatched driver so staff can claim it in /portal and clients can track it
    await db.execute({
      sql: `
        INSERT INTO orders (order_id, client_name, hospital_name, pickup_time, staff_id, driver_id, current_status, updated_at)
        VALUES (?, ?, ?, ?, 'unassigned', ?, 1, ?)
      `,
      args: [orderId, patientName, hospitalName, timeText, assignedDriverId, createdAt],
    });

    return res.status(200).json({
      ok: true,
      order_id: orderId,
      bookingId: orderId,
      driver_id: assignedDriverId,
      basePrice,
      addonsTotal,
      pickupZone,
      distanceKm,
      extraKm,
      mileageFee,
      totalPrice,
      addons,
      storageTarget: isTursoConfigured ? 'turso' : 'local-libsql',
      whatsappMessage,
      createdAt,
    });
  } catch (error) {
    console.error('Failed to process booking in Turso:', error);
    return res.status(500).json({
      error: 'Unable to save booking to database. Please try again.',
    });
  }
}
