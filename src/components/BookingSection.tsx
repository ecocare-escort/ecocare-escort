import { useEffect, useState, FormEvent } from 'react';
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MessageSquare,
  PhoneCall,
} from 'lucide-react';
import { KLANG_VALLEY_ZONES } from '../data/ecocareData';

export type PricingTier = 'tier1' | 'tier2';

export interface BookingPrefill {
  tierId: PricingTier;
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

interface BookingConfirmation {
  bookingId: string;
  patientName: string;
  hospitalName: string;
  tierLabel: string;
  addons: { id: string; label: string; price: number }[];
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
    price: 100,
  },
  {
    id: 'tier2',
    name: 'Premium Proxy Package',
    description: 'Tier 1 + In-room consultation companion, structured medical report, multimedia live updates · Up to 4 hours',
    price: 150,
  },
];

const WHEELCHAIR_FEE = 15;
const FASTING_MEAL_FEE = 10;

const ALL_HOSPITALS = KLANG_VALLEY_ZONES.flatMap((z) => z.hospitals);

export function BookingSection({ prefill, onOpenTracker }: BookingSectionProps) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  // Dynamic pricing React States (useState)
  const [selectedTier, setSelectedTier] = useState<PricingTier>('tier1');
  const [needsWheelchair, setNeedsWheelchair] = useState<boolean>(false);
  const [needsFastingMeal, setNeedsFastingMeal] = useState<boolean>(false);

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
    setSelectedTier(prefill.tierId);
  }, [prefill]);

  // Real-time Total Price calculation
  const basePrice = selectedTier === 'tier2' ? 150 : 100;
  const wheelchairAddon = needsWheelchair ? WHEELCHAIR_FEE : 0;
  const fastingMealAddon = needsFastingMeal ? FASTING_MEAL_FEE : 0;
  const totalPrice = basePrice + wheelchairAddon + fastingMealAddon;

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
          tierId: selectedTier,
          needsWheelchair,
          needsFastingMeal,
          appointmentDate,
          pickupTime,
          notes: notes.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit booking. Please try again.');
      }

      const activeTierInfo =
        TIER_OPTIONS.find((t) => t.id === selectedTier) ?? TIER_OPTIONS[0];

      setConfirmation({
        bookingId: data.bookingId,
        patientName: patientOrCaregiverName.trim(),
        hospitalName: facilityName.trim(),
        tierLabel: `${activeTierInfo.name} - RM ${activeTierInfo.price}`,
        addons: data.addons || [],
        totalPrice: data.totalPrice ?? totalPrice,
        whatsappMessage: data.whatsappMessage,
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
    <section id="book" className="bg-white py-14 md:py-20">
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
                    Choose Basic Care (RM 100) or Premium Proxy (RM 150) for up to 4 hours of escort support with zero hidden fees.
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
                      const isSelected = selectedTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedTier(tier.id)}
                          className={`flex flex-col justify-between rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                            isSelected
                              ? 'border-emerald-700 bg-emerald-50/80 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-display text-sm font-semibold text-slate-900">
                              {tier.name}
                            </span>
                            <span className="font-mono text-base font-semibold tabular-nums text-emerald-700 shrink-0">
                              RM {tier.price}
                            </span>
                          </div>
                          <span className="mt-1.5 text-xs leading-relaxed text-slate-600">
                            {tier.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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

                {/* Real-Time Total Price Bar & Submit Action */}
                <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-xs font-medium text-slate-600">
                        Total Price
                      </span>
                      <span
                        data-testid="total-price"
                        className="font-mono text-2xl font-bold tabular-nums text-slate-900"
                      >
                        RM {totalPrice}
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] tabular-nums text-slate-500">
                      Base RM {basePrice}
                      {needsWheelchair ? ` + Wheelchair RM ${WHEELCHAIR_FEE}` : ''}
                      {needsFastingMeal ? ` + Meal Run RM ${FASTING_MEAL_FEE}` : ''}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                  >
                    {isSubmitting ? 'Saving Booking...' : 'Confirm Booking & Generate WhatsApp Text'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
