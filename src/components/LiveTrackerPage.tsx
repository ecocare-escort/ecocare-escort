import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Home,
  Phone,
  Pill,
  RefreshCw,
  Share2,
  ShieldCheck,
  Star,
  User,
  UserCheck,
} from 'lucide-react';

export interface TrackedBookingInfo {
  bookingId: string;
  patientName?: string;
  hospitalName?: string;
}

interface TrackerApiRecord {
  order_id: string;
  client_name: string;
  hospital_name: string | null;
  pickup_time?: string | null;
  current_status: number;
  updated_at: string;
  staff_id: string | null;
  staff_name: string | null;
  staff_role?: string | null;
  staff_phone?: string | null;
  staff_photo_url: string | null;
  staff_cpr_certificate_id: string | null;
}

interface LiveTrackerPageProps {
  orderId?: string;
  bookingInfo?: TrackedBookingInfo | null;
  onSelectOrderId?: (orderId: string) => void;
  onOpenStaffPortal?: () => void;
  onBackToHome: () => void;
}

interface TrackerStage {
  status: number;
  title: string;
  subtitle: string;
  detail: string;
  Icon: typeof UserCheck;
}

const TRACKER_STAGES: TrackerStage[] = [
  {
    status: 1,
    title: 'Driver Assigned',
    subtitle: 'Companion & vehicle confirmed',
    detail:
      'Your Serdang student companion has verified your booking details and packed the first-aid kit.',
    Icon: UserCheck,
  },
  {
    status: 2,
    title: 'En Route',
    subtitle: 'Heading to hospital',
    detail:
      'Patient safely picked up from home and currently en route to the main hospital lobby.',
    Icon: Car,
  },
  {
    status: 3,
    title: 'In Queue',
    subtitle: 'Registered & waiting at clinic',
    detail:
      'Counter registration completed. Companion is seated with the patient watching the clinic queue screen.',
    Icon: Clock,
  },
  {
    status: 4,
    title: 'Pharmacy',
    subtitle: 'Collecting prescribed medication',
    detail:
      'Doctor consultation finished. Companion is queueing at the pharmacy counter and checking dosage labels.',
    Icon: Pill,
  },
  {
    status: 5,
    title: 'Heading Home',
    subtitle: 'Safe return trip in progress',
    detail:
      'All medications collected. Escorting the patient back home and settling them safely indoors.',
    Icon: Home,
  },
  {
    status: 6,
    title: 'Order Completed',
    subtitle: 'Service completed safely',
    detail:
      'Patient has arrived safely indoors and the escort session is officially closed.',
    Icon: CheckCircle2,
  },
];

export function LiveTrackerPage({
  orderId,
  bookingInfo,
  onSelectOrderId,
  onOpenStaffPortal,
  onBackToHome,
}: LiveTrackerPageProps) {
  const resolvedOrderId =
    orderId || bookingInfo?.bookingId || 'ECE-842190';

  const [tracker, setTracker] = useState<TrackerApiRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [lookupInput, setLookupInput] = useState<string>(resolvedOrderId);

  // Client Review Form State (shown when status === 6)
  const [rating, setRating] = useState<number>(0);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  const fetchTracker = async (targetOrderId: string, silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
      setPhotoFailed(false);
    }
    try {
      const response = await fetch(
        `/api/get-tracker?order_id=${encodeURIComponent(targetOrderId)}`
      );
      const data = await response.json();
      if (!response.ok || !data.tracker) {
        throw new Error(data.error || `Order ${targetOrderId} not found.`);
      }
      setTracker(data.tracker as TrackerApiRecord);
    } catch (err) {
      if (!silent) {
        setTracker(null);
        setError(
          err instanceof Error ? err.message : 'Unable to fetch live tracker data.'
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setLookupInput(resolvedOrderId);
    setRating(0);
    setHoveredStar(0);
    setComment('');
    setReviewError(null);
    setReviewSubmitted(false);
    fetchTracker(resolvedOrderId);
  }, [resolvedOrderId]);

  const activeStatus = Math.min(6, Math.max(1, Number(tracker?.current_status ?? 1)));
  const isCompleted = activeStatus === 6;

  // Poll every 5s while trip is active so status 6 syncs automatically from Employee Portal
  useEffect(() => {
    if (!tracker || activeStatus >= 6) return;
    const timer = window.setInterval(() => {
      fetchTracker(tracker.order_id, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [tracker?.order_id, activeStatus]);

  const currentStageIndex = activeStatus - 1;
  const currentStage = TRACKER_STAGES[currentStageIndex];

  const handleShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/track/${encodeURIComponent(
        resolvedOrderId
      )}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setCopiedLink(false);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setReviewError('Please select a star rating before submitting.');
      return;
    }
    setReviewError(null);
    setReviewSubmitted(true);
  };

  const formattedUpdatedTime = tracker?.updated_at
    ? new Date(tracker.updated_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  const displayedStars = hoveredStar || rating;

  return (
    <section
      aria-label="Dynamic Client Escort Tracker"
      className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-6 sm:px-6 sm:py-12"
    >
      <div className="mx-auto w-full max-w-xl">
        {/* Top Mobile-First Action Row */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenStaffPortal && (
              <button
                type="button"
                onClick={onOpenStaffPortal}
                className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                Staff Portal
              </button>
            )}

            <button
              type="button"
              onClick={handleShareLink}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  <span>Share Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Order Lookup Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = lookupInput.trim();
            if (!trimmed) return;
            if (onSelectOrderId) {
              onSelectOrderId(trimmed);
            } else {
              fetchTracker(trimmed);
            }
          }}
          className="mb-4 flex gap-2"
        >
          <input
            type="text"
            aria-label="Order ID lookup"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder="Enter Order ID (e.g. ECE-842190)"
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
          <button
            type="submit"
            className="min-h-[44px] rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            Track Order
          </button>
        </form>

        {/* Main Mobile-First Tracker Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw
                className="mx-auto h-6 w-6 animate-spin text-emerald-700"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Loading live status for {resolvedOrderId}...
              </p>
            </div>
          ) : error || !tracker ? (
            <div className="p-8 text-center">
              <p className="font-display text-lg font-semibold text-slate-900">
                Order not found
              </p>
              <p className="mt-1.5 text-sm text-slate-600">
                {error || `We could not find an escort order matching "${resolvedOrderId}".`}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectOrderId) {
                      onSelectOrderId('ECE-842190');
                    } else {
                      fetchTracker('ECE-842190');
                    }
                  }}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  Load Sample Order (ECE-842190)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Companion Profile Card */}
              <div className="border-b border-slate-200 bg-slate-900 px-5 py-6 text-white sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                  <span className="font-mono tabular-nums text-emerald-300">
                    ORDER {tracker.order_id}
                  </span>
                  <span>{tracker.hospital_name || 'Klang Valley Hospital'}</span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  {tracker.staff_photo_url && !photoFailed ? (
                    <img
                      src={tracker.staff_photo_url}
                      alt={tracker.staff_name || 'Assigned Care Companion'}
                      referrerPolicy="no-referrer"
                      onError={() => setPhotoFailed(true)}
                      className="h-16 w-16 shrink-0 rounded-full border-2 border-emerald-400/70 object-cover object-top"
                    />
                  ) : (
                    <div
                      aria-label="Companion circular photo placeholder"
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-emerald-400/70 bg-slate-800 text-emerald-300"
                    >
                      <User className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-300">
                      Assigned Care Companion
                    </p>
                    <h1 className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight text-white sm:text-xl">
                      {tracker.staff_name || 'Pending Companion Assignment'}
                    </h1>
                    {tracker.staff_name ? (
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>CPR / First-Aid ID</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-medium tabular-nums text-white">
                          {tracker.staff_cpr_certificate_id || 'Verified'}
                        </span>
                        {tracker.staff_phone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <a
                              href={`tel:${tracker.staff_phone.replace(/\s+/g, '')}`}
                              className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-200 hover:text-emerald-300 hover:underline"
                            >
                              <Phone className="h-3 w-3" aria-hidden="true" />
                              <span>{tracker.staff_phone}</span>
                            </a>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        Paid booking received · Awaiting companion dispatch from Serdang.
                      </p>
                    )}
                  </div>
                </div>

                {/* Active Patient & Stage Summary Banner */}
                <div className="mt-5 flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-300">
                    Patient:{' '}
                    <span className="font-semibold text-white">
                      {tracker.client_name}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-emerald-300">
                    Status: {currentStage.title} · Updated {formattedUpdatedTime}
                  </div>
                </div>
              </div>

              {/* Conditional Body: Step 6 Service Completed & Review Form vs. 1-6 Timeline */}
              {isCompleted ? (
                <div className="px-5 py-7 sm:px-7 sm:py-8">
                  {/* Service Completed Success State */}
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h2 className="mt-3 font-display text-xl font-bold text-slate-900">
                      Service Completed
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-600">
                      {tracker.client_name} has arrived safely home
                      {tracker.staff_name ? (
                        <>
                          {' '}
                          with{' '}
                          <span className="font-medium text-slate-900">
                            {tracker.staff_name}
                          </span>
                        </>
                      ) : null}
                      .
                    </p>
                  </div>

                  {/* Review Form or Thank You Message */}
                  {reviewSubmitted ? (
                    <div
                      role="status"
                      className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center"
                    >
                      <CheckCircle2
                        className="mx-auto h-6 w-6 text-emerald-700"
                        aria-hidden="true"
                      />
                      <p className="mt-2 font-display text-base font-semibold text-emerald-900">
                        Thank you for your feedback!
                      </p>
                      <p className="mt-1 text-xs text-emerald-800">
                        Your {rating}-star rating helps our student care team improve every trip.
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleReviewSubmit}
                      className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-5"
                    >
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Rate Your Escort Experience
                      </h3>

                      {/* 5-Star Rating Selector */}
                      <div className="mt-3">
                        <span className="block text-xs font-medium text-slate-600">
                          Select a star rating
                        </span>
                        <div
                          className="mt-2 flex items-center gap-1.5"
                          role="group"
                          aria-label="5-star rating selector"
                        >
                          {[1, 2, 3, 4, 5].map((starValue) => {
                            const active = starValue <= displayedStars;
                            return (
                              <button
                                key={starValue}
                                type="button"
                                aria-label={`Rate ${starValue} ${
                                  starValue === 1 ? 'star' : 'stars'
                                }`}
                                aria-pressed={rating === starValue}
                                onMouseEnter={() => setHoveredStar(starValue)}
                                onMouseLeave={() => setHoveredStar(0)}
                                onClick={() => {
                                  setRating(starValue);
                                  if (reviewError) setReviewError(null);
                                }}
                                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white transition-colors hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                              >
                                <Star
                                  className={`h-5 w-5 transition-colors ${
                                    active
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-slate-300'
                                  }`}
                                  aria-hidden="true"
                                />
                              </button>
                            );
                          })}

                          <span className="ml-2 font-mono text-xs tabular-nums text-slate-600">
                            {rating > 0 ? `${rating}/5` : '0/5'}
                          </span>
                        </div>
                      </div>

                      {/* Review Comments Textarea */}
                      <div className="mt-4">
                        <label
                          htmlFor="client-review-comment"
                          className="block text-xs font-medium text-slate-600"
                        >
                          Comments (Optional)
                        </label>
                        <textarea
                          id="client-review-comment"
                          rows={3}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="How was your experience with our escort?"
                          className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                        />
                      </div>

                      {reviewError && (
                        <p
                          role="alert"
                          className="mt-2.5 text-xs font-medium text-red-700"
                        >
                          {reviewError}
                        </p>
                      )}

                      <button
                        type="submit"
                        className="mt-4 min-h-[48px] w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                      >
                        Submit Review
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Active 1–6 Vertical Delivery-Style Timeline */
                <div className="px-5 py-6 sm:px-7 sm:py-8">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="font-display text-sm font-semibold text-slate-900">
                      Live Appointment Progress
                    </h2>
                    <button
                      type="button"
                      onClick={() => fetchTracker(tracker.order_id)}
                      className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-emerald-700 hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      <span>
                        Step {activeStatus} of {TRACKER_STAGES.length}
                      </span>
                    </button>
                  </div>

                  <ol
                    className="relative space-y-0"
                    aria-label="Live escort progress timeline"
                  >
                    {TRACKER_STAGES.map((stage, index) => {
                      const isCompletedStage = stage.status < activeStatus;
                      const isCurrent = stage.status === activeStatus;
                      const isPending = stage.status > activeStatus;
                      const isLast = index === TRACKER_STAGES.length - 1;
                      const StageIcon = stage.Icon;

                      return (
                        <li
                          key={stage.status}
                          className="relative flex gap-4 pb-7 last:pb-0"
                        >
                          {!isLast && (
                            <span
                              aria-hidden="true"
                              className={`absolute left-[15px] top-8 bottom-0 w-0.5 transition-colors duration-200 ${
                                isCompletedStage ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            />
                          )}

                          <div
                            aria-hidden="true"
                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                              isCurrent
                                ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                                : isCompletedStage
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {isCompletedStage ? (
                              <Check className="h-4 w-4 stroke-[2.5]" />
                            ) : (
                              <StageIcon className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-baseline justify-between gap-3">
                              <span
                                className={`font-display text-base font-semibold ${
                                  isCurrent
                                    ? 'text-emerald-600'
                                    : isCompletedStage
                                      ? 'text-slate-900'
                                      : 'text-slate-400'
                                }`}
                              >
                                <span className="font-mono tabular-nums mr-1.5">
                                  {stage.status}.
                                </span>
                                {stage.title}
                              </span>
                              <span
                                className={`font-mono text-xs tabular-nums shrink-0 ${
                                  isPending ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {isCurrent
                                  ? formattedUpdatedTime
                                  : isCompletedStage
                                    ? 'Completed'
                                    : 'Pending'}
                              </span>
                            </div>

                            <p
                              className={`mt-0.5 text-sm font-medium ${
                                isPending
                                  ? 'text-slate-400'
                                  : isCurrent
                                    ? 'text-slate-900'
                                    : 'text-slate-700'
                              }`}
                            >
                              {stage.subtitle}
                            </p>

                            {!isPending && (
                              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                {stage.detail}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
