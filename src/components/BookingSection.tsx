import { useEffect, useState, FormEvent } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  Copy,
  HeartHandshake,
  Mail,
  MapPin,
  MessageSquare,
  PhoneCall,
} from 'lucide-react';
import { KLANG_VALLEY_ZONES } from '../data/ecocareData';

export type PricingTier = 'tier1' | 'tier2';

export interface BookingPrefill {
  tierId: PricingTier;
  isB40?: boolean;
}

interface BookingSectionProps {
  prefill: BookingPrefill | null;
  onOpenTracker?: (info: {
    bookingId: string;
    patientName: string;
    hospitalName: string;
  }) => void;
}

interface FormErrors {
  patientOrCaregiverName?: string;
  email?: string;
  phone?: string;
  appointmentDate?: string;
  facilityName?: string;
  submit?: string;
}

type PickupZone = 'serdang' | 'other';

interface BookingConfirmation {
  bookingId: string;
  patientName: string;
  hospitalName: string;
  tierLabel: string;
  addons: { id: string; label: string; price: number }[];
  pickupZone: PickupZone;
  distanceKm: number;
  mileageFee: number;
  totalPrice: number;
  whatsappMessage: string;
  storageTarget: string;
}

const TIER_OPTIONS: {
  id: PricingTier;
  name: string;
  description: string;
  price: number;
}[] = [
  {
    id: 'tier1',
    name: 'Basic Care Package',
    description: 'Door-to-door transport, hospital navigation, basic WhatsApp text updates · Up to 4 hours',
    price: 150,
  },
  {
    id: 'tier2',
    name: 'Premium Proxy Package',
    description: 'Tier 1 + In-room consultation companion, structured medical report, multimedia live updates · Up to 4 hours',
    price: 200,
  },
];

const WHEELCHAIR_FEE = 15;
const FASTING_MEAL_FEE = 10;
const FREE_SERDANG_KM = 10;
const EXTRA_KM_RATE = 2;

const DISTANCE_PRESETS: { label: string; km: number }[] = [
  { label: 'Puchong (16 km)', km: 16 },
  { label: 'Cheras (18 km)', km: 18 },
  { label: 'KL City (22 km)', km: 22 },
  { label: 'PJ / Subang (25 km)', km: 25 },
];

const ALL_HOSPITALS = KLANG_VALLEY_ZONES.flatMap((z) => z.hospitals);

export function BookingSection({ prefill, onOpenTracker }: BookingSectionProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  // Dynamic pricing React States (useState)
  const [selectedTier, setSelectedTier] = useState<PricingTier>('tier1');
  const [isB40, setIsB40] = useState<boolean>(false);
  const [needsWheelchair, setNeedsWheelchair] = useState<boolean>(false);
  const [needsFastingMeal, setNeedsFastingMeal] = useState<boolean>(false);
  const [pickupZone, setPickupZone] = useState<PickupZone>('serdang');
  const [distanceInput, setDistanceInput] = useState<string>('15');

  // Form fields state
  const [patientOrCaregiverName, setPatientOrCaregiverName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(defaultDate);
  const [pickupTime, setPickupTime] = useState('08:00');
  const [facilityName, setFacilityName] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    if (prefill.isB40) {
      setIsB40(true);
      setSelectedTier('tier2');
    } else {
      setIsB40(false);
      setSelectedTier(prefill.tierId);
    }
  }, [prefill]);

  const handleToggleB40 = (checked: boolean) => {
    setIsB40(checked);
    if (checked) {
      setSelectedTier('tier2');
    }
  };

  // Real-time Total Price calculation (Option A: RM 150 / RM 200; B40 Subsidized Premium = RM 150 + mileage beyond 10 km)
  const effectiveTierId: PricingTier = isB40 ? 'tier2' : selectedTier;
  const activeTierInfo =
    TIER_OPTIONS.find((t) => t.id === effectiveTierId) ?? TIER_OPTIONS[0];
  const basePrice = isB40 ? 150 : activeTierInfo.price;
  const wheelchairAddon = needsWheelchair ? WHEELCHAIR_FEE : 0;
  const fastingMealAddon = needsFastingMeal ? FASTING_MEAL_FEE : 0;
  const parsedDistance = Number(distanceInput);
  const effectiveDistanceKm =
    pickupZone === 'other'
      ? Math.max(11, Math.round(Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : 15))
      : 0;
  const extraKm =
    pickupZone === 'other' ? Math.max(0, effectiveDistanceKm - FREE_SERDANG_KM) : 0;
  const mileageFee = extraKm * EXTRA_KM_RATE;
  const totalPrice = basePrice + wheelchairAddon + fastingMealAddon + mileageFee;

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!patientOrCaregiverName.trim() || patientOrCaregiverName.trim().length < 2) {
      nextErrors.patientOrCaregiverName = 'Please enter the patient or caregiver full name.';
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address for booking confirmation.';
    }
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 9) {
      nextErrors.phone = 'Please enter a valid Malaysian phone number (e.g. +60 12-345 6789).';
    }
    if (!appointmentDate) {
      nextErrors.appointmentDate = 'Please select an appointment date.';
    }
    if (!facilityName.trim()) {
      nextErrors.facilityName = 'Please enter or choose a hospital in the Klang Valley.';
    }
    return nextErrors;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientOrCaregiverName.trim(),
          hospitalName: facilityName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          tierId: effectiveTierId,
          is_b40: isB40,
          needsWheelchair,
          needsFastingMeal,
          pickupZone,
          distanceKm: pickupZone === 'other' ? effectiveDistanceKm : 0,
          appointmentDate,
          pickupTime,
          notes: notes.trim(),
        }),
      });

      const rawText = await response.text();
      const contentType = response.headers.get('content-type') || '';
      let data: {
        ok?: boolean;
        order_id?: string;
        bookingId?: string;
        addons?: { id: string; label: string; price: number }[];
        pickupZone?: PickupZone;
        distanceKm?: number;
        mileageFee?: number;
        totalPrice?: number;
        whatsappMessage?: string;
        storageTarget?: string;
        error?: string;
      } | null = null;

      if (rawText) {
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(rawText);
          } catch {
            throw new Error(
              'The booking service returned an invalid JSON response. Please try again.'
            );
          }
        } else {
          try {
            data = JSON.parse(rawText);
          } catch {
            throw new Error(
              `Booking request failed (${response.status}): ${rawText.trim().slice(0, 140) || 'Unexpected non-JSON response from server.'}`
            );
          }
        }
      }

      if (!response.ok || !data) {
        throw new Error(
          data?.error ||
            `Failed to submit booking (${response.status}). Please try again.`
        );
      }

      const confirmedOrderId = data.order_id || data.bookingId || '';

      setConfirmation({
        bookingId: confirmedOrderId,
        patientName: patientOrCaregiverName.trim(),
        hospitalName: facilityName.trim(),
        tierLabel: isB40
          ? `${activeTierInfo.name} — RM 150 (B40 Inclusive Care)`
          : `${activeTierInfo.name} — RM ${activeTierInfo.price}`,
        addons: data.addons || [],
        pickupZone: data.pickupZone || pickupZone,
        distanceKm: data.distanceKm ?? effectiveDistanceKm,
        mileageFee: data.mileageFee ?? mileageFee,
        totalPrice: data.totalPrice ?? totalPrice,
        whatsappMessage: data.whatsappMessage || '',
        storageTarget: data.storageTarget || 'turso',
      });
      setCopiedWhatsapp(false);
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error
            ? err.message
            : 'Unable to save booking right now. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyWhatsapp = async () => {
    if (!confirmation) return;
    try {
      await navigator.clipboard.writeText(confirmation.whatsappMessage);
      setCopiedWhatsapp(true);
      setTimeout(() => setCopiedWhatsapp(false), 2500);
    } catch {
      setCopiedWhatsapp(false);
    }
  };

  return (
    <section id="book-now" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-wide text-emerald-700">
              Book Now · Smart Booking Form
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,3.5vw,2.75rem)] font-bold tracking-tight text-slate-900 text-balance">
              Book a certified companion in the Klang Valley
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Select your care package and add-ons to see your exact flat-rate price in real time. Submitting saves your booking to our database and generates an instant WhatsApp confirmation message.
            </p>

            <div className="mt-8 space-y-5 border-t border-slate-200 pt-8">
              <div className="flex items-start gap-3">
                <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Transparent Flat-Rate Pricing
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Choose Basic Care (RM 150) or Premium Proxy (RM 200) for up to 4 hours of escort support — plus free mileage within Serdang (&le; 10 km) and RM 2.00/km beyond 10 km for other Klang Valley areas.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Direct Serdang Coordinator Line
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    Need urgent scheduling or special mobility coordination? WhatsApp or call us at{' '}
                    <span className="font-mono font-medium tabular-nums text-slate-900">
                      +60 12-345 6789
                    </span>
                    .
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Official Inquiries
                  </h3>
                  <p className="mt-0.5 font-mono text-sm text-slate-600">
                    ecocare.escort@gmail.com
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {confirmation ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 md:p-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
                  <div className="w-full">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-emerald-800">
                      <span>ORDER {confirmation.bookingId}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Saved to {confirmation.storageTarget === 'turso' ? 'Turso SQL' : 'libSQL Database'}
                      </span>
                    </div>
                    <h3 className="mt-1 font-display text-2xl font-semibold text-slate-900">
                      Booking confirmed and recorded
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      Patient / Contact: <span className="font-semibold">{confirmation.patientName}</span> · Hospital:{' '}
                      <span className="font-semibold">{confirmation.hospitalName}</span> · Total Price:{' '}
                      <span className="font-mono font-semibold tabular-nums text-emerald-800">
                        RM {confirmation.totalPrice}
                      </span>
                    </p>

                    {/* Auto-generated WhatsApp Order Confirmation Box */}
                    <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                        <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <MessageSquare className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          WhatsApp Order Confirmation Text
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyWhatsapp}
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          {copiedWhatsapp ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Copy Text</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="mt-3 select-all text-sm leading-relaxed text-slate-800">
                        {confirmation.whatsappMessage}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <a
                        href={`https://wa.me/60123456789?text=${encodeURIComponent(confirmation.whatsappMessage)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                      >
                        <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        <span>Send via WhatsApp</span>
                      </a>

                      {onOpenTracker && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenTracker({
                              bookingId: confirmation.bookingId,
                              patientName: confirmation.patientName,
                              hospitalName: confirmation.hospitalName,
                            })
                          }
                          className="rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          Open Live Tracker
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setConfirmation(null)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                      >
                        Book Another Trip
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 md:p-8"
              >
                {/* Tier 1 / Tier 2 Dynamic Pricing Selector */}
                <div className="mb-6">
                  <span className="block text-xs font-medium text-slate-700">
                    Select Care Package *
                  </span>
                  <div
                    role="radiogroup"
                    aria-label="Select Care Package"
                    className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    {TIER_OPTIONS.map((tier) => {
                      const isSelected = effectiveTierId === tier.id;
                      const isB40Premium = isB40 && tier.id === 'tier2';
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => {
                            if (tier.id === 'tier1' && isB40) {
                              setIsB40(false);
                            }
                            setSelectedTier(tier.id);
                          }}
                          className={`flex flex-col justify-between rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-50/80 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-display text-sm font-semibold text-slate-900">
                                {tier.name} — RM {isB40Premium ? 150 : tier.price}
                              </span>
                              {isB40Premium && (
                                <span className="mt-1 inline-flex items-center rounded border border-emerald-200 bg-emerald-100/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  B40 Subsidized · -RM 50
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-base font-semibold tabular-nums text-emerald-700 shrink-0 text-right">
                              {isB40Premium ? (
                                <span className="flex flex-col items-end">
                                  <span className="text-xs font-normal text-slate-400 line-through">
                                    RM {tier.price}
                                  </span>
                                  <span>RM 150</span>
                                </span>
                              ) : (
                                <>RM {tier.price}</>
                              )}
                            </span>
                          </div>
                          <span className="mt-1.5 text-xs leading-relaxed text-slate-600">
                            {tier.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* B40 Inclusive Care Toggle / Checkbox Card */}
                  <label
                    className={`mt-3 flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4 transition-colors ${
                      isB40
                        ? 'border-emerald-700 bg-emerald-50/80'
                        : 'border-emerald-200/80 bg-white hover:border-emerald-400'
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isB40}
                        onChange={(e) => handleToggleB40(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                      />
                      <span>
                        <span className="flex flex-wrap items-center gap-2">
                          <HeartHandshake
                            className="h-4 w-4 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                          <span className="font-display text-sm font-semibold text-slate-900">
                            Apply B40 Inclusive Care Rate (Save RM 50)
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                          Enjoy full Premium Proxy service for RM 150. You will be asked to share your STR (Sumbangan Tunai Rahmah) screenshot via WhatsApp for quick verification.
                        </span>
                      </span>
                    </span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700 shrink-0">
                      -RM 50
                    </span>
                  </label>
                </div>

                {/* Patient & Hospital Fields */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="booking-name"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Patient or Caregiver Full Name *
                    </label>
                    <input
                      id="booking-name"
                      type="text"
                      value={patientOrCaregiverName}
                      onChange={(e) => setPatientOrCaregiverName(e.target.value)}
                      placeholder="e.g., Ahmad Razak / Jason Lim"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    {errors.patientOrCaregiverName && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {errors.patientOrCaregiverName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="booking-facility"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Klang Valley Hospital or Clinic *
                    </label>
                    <input
                      id="booking-facility"
                      type="text"
                      list="klang-valley-hospitals"
                      value={facilityName}
                      onChange={(e) => setFacilityName(e.target.value)}
                      placeholder="e.g., Hospital Serdang / Sunway Medical Centre"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    <datalist id="klang-valley-hospitals">
                      {ALL_HOSPITALS.map((hospital) => (
                        <option key={hospital} value={hospital} />
                      ))}
                    </datalist>
                    {errors.facilityName && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {errors.facilityName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="booking-email"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Confirmation Email *
                    </label>
                    <input
                      id="booking-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="caregiver@gmail.com"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="booking-phone"
                      className="block text-xs font-medium text-slate-700"
                    >
                      WhatsApp Phone Number *
                    </label>
                    <input
                      id="booking-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+60 12-345 6789"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="booking-date"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Appointment Date *
                    </label>
                    <input
                      id="booking-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    {errors.appointmentDate && (
                      <p className="mt-1 text-xs text-red-700" role="alert">
                        {errors.appointmentDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="booking-time"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Home Pickup Time
                    </label>
                    <input
                      id="booking-time"
                      type="time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  {/* Dynamic Add-on Checkboxes */}
                  <div className="sm:col-span-2">
                    <span className="block text-xs font-medium text-slate-700">
                      Optional Add-ons
                    </span>
                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                          needsWheelchair
                            ? 'border-emerald-700 bg-emerald-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={needsWheelchair}
                            onChange={(e) => setNeedsWheelchair(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                          />
                          <span className="font-medium text-slate-900">
                            Wheelchair Provision
                          </span>
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700">
                          +RM {WHEELCHAIR_FEE}
                        </span>
                      </label>

                      <label
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                          needsFastingMeal
                            ? 'border-emerald-700 bg-emerald-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={needsFastingMeal}
                            onChange={(e) => setNeedsFastingMeal(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                          />
                          <span className="font-medium text-slate-900">
                            Post-blood Test Meal Run
                          </span>
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700">
                          +RM {FASTING_MEAL_FEE}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Pickup Location & Mileage Calculator (Option A) */}
                  <div className="sm:col-span-2">
                    <span className="block text-xs font-medium text-slate-700">
                      Pickup Location &amp; Mileage Calculator
                    </span>
                    <div
                      role="radiogroup"
                      aria-label="Pickup Location Zone"
                      className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={pickupZone === 'serdang'}
                        onClick={() => setPickupZone('serdang')}
                        className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                          pickupZone === 'serdang'
                            ? 'border-emerald-700 bg-emerald-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          <MapPin
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              pickupZone === 'serdang' ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span>
                            <span className="block text-sm font-medium text-slate-900">
                              Serdang Area (&le; 10 km)
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              Serdang Free Zone
                            </span>
                          </span>
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700 shrink-0">
                          RM 0
                        </span>
                      </button>

                      <button
                        type="button"
                        role="radio"
                        aria-checked={pickupZone === 'other'}
                        onClick={() => {
                          setPickupZone('other');
                          if (!distanceInput || Number(distanceInput) < 11) {
                            setDistanceInput('15');
                          }
                        }}
                        className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                          pickupZone === 'other'
                            ? 'border-emerald-700 bg-emerald-50/70'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-start gap-2.5">
                          <MapPin
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                              pickupZone === 'other' ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                            aria-hidden="true"
                          />
                          <span>
                            <span className="block text-sm font-medium text-slate-900">
                              Other Klang Valley Area (&gt; 10 km)
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              First 10 km free
                            </span>
                          </span>
                        </span>
                        <span className="font-mono text-xs font-semibold tabular-nums text-emerald-700 shrink-0">
                          RM 2.00 / extra km
                        </span>
                      </button>
                    </div>

                    {pickupZone === 'other' && (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div className="sm:max-w-xs flex-1">
                            <label
                              htmlFor="booking-distance-km"
                              className="block text-xs font-medium text-slate-700"
                            >
                              Estimated Distance from Serdang Hub (km)
                            </label>
                            <input
                              id="booking-distance-km"
                              type="number"
                              min={11}
                              step={1}
                              value={distanceInput}
                              onChange={(e) => setDistanceInput(e.target.value)}
                              onBlur={() =>
                                setDistanceInput(String(effectiveDistanceKm))
                              }
                              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                            />
                          </div>
                          <p className="font-mono text-xs tabular-nums text-slate-600">
                            {extraKm} extra km &times; RM {EXTRA_KM_RATE} ={' '}
                            <span className="font-semibold text-emerald-700">
                              +RM {mileageFee}
                            </span>
                          </p>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium text-slate-500">
                            Quick presets:
                          </span>
                          {DISTANCE_PRESETS.map((preset) => {
                            const activePreset = effectiveDistanceKm === preset.km;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setDistanceInput(String(preset.km))}
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                                  activePreset
                                    ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                {preset.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="booking-notes"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Pickup Address, Condo Access, or Language Preference
                    </label>
                    <textarea
                      id="booking-notes"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Sri Serdang apartment Block B, prefers Mandarin/BM speaking companion, light porridge after blood draw..."
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>
                </div>

                {errors.submit && (
                  <div
                    role="alert"
                    className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
                  >
                    {errors.submit}
                  </div>
                )}

                {/* Real-Time Price Breakdown Box & Submit Action */}
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Real-Time Price Breakdown
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Up to 4 hours · Overtime &gt; 4 hrs: +RM 30/hr
                    </span>
                  </div>

                  <dl className="mt-3 space-y-2 text-xs">
                    {isB40 ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-slate-600">Premium Proxy Package</dt>
                          <dd className="font-mono font-semibold tabular-nums text-slate-900">
                            RM 200
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <dt className="font-medium text-emerald-800">
                            B40 Inclusive Care Subsidy (UN SDG 10)
                          </dt>
                          <dd className="font-mono font-semibold tabular-nums text-emerald-700">
                            -RM 50
                          </dd>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-slate-600">
                          Base Package ({activeTierInfo.name})
                        </dt>
                        <dd className="font-mono font-semibold tabular-nums text-slate-900">
                          RM {basePrice}
                        </dd>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-600">Selected Add-ons</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-800 text-right">
                        {!needsWheelchair && !needsFastingMeal ? (
                          <span className="text-slate-500">RM 0 (None)</span>
                        ) : (
                          <span>
                            {[
                              needsWheelchair ? `Wheelchair +RM ${WHEELCHAIR_FEE}` : null,
                              needsFastingMeal ? `Meal Run +RM ${FASTING_MEAL_FEE}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </dd>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-slate-600">Mileage Surcharge</dt>
                      <dd className="font-mono font-medium tabular-nums text-right">
                        {pickupZone === 'serdang' ? (
                          <span className="text-emerald-700">
                            RM 0 — Serdang Free Zone
                          </span>
                        ) : (
                          <span className="text-slate-900">
                            +RM {mileageFee} ({extraKm} km &times; RM {EXTRA_KM_RATE})
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {isB40 && (
                    <p className="mt-3 text-[11px] italic text-emerald-800">
                      *Rate subject to quick STR / B40 proof verification on WhatsApp.*
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="block text-xs font-medium text-slate-600">
                        Estimated Total
                      </span>
                      <span
                        data-testid="total-price"
                        className="font-mono text-2xl font-bold tabular-nums text-slate-900"
                      >
                        RM {totalPrice}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                    >
                      {isSubmitting ? 'Saving Booking...' : 'Confirm Booking & Generate WhatsApp Text'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
