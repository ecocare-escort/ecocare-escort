import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Car,
  Check,
  Clock,
  Home,
  Pill,
  RefreshCw,
  Share2,
  ShieldCheck,
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
  current_status: number;
  updated_at: string;
  staff_id: string;
  staff_name: string;
  staff_photo_url: string | null;
  staff_cpr_certificate_id: string;
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

  const fetchTracker = async (targetOrderId: string) => {
    setLoading(true);
    setError(null);
    setPhotoFailed(false);
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
      setTracker(null);
      setError(
        err instanceof Error ? err.message : 'Unable to fetch live tracker data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLookupInput(resolvedOrderId);
    fetchTracker(resolvedOrderId);
  }, [resolvedOrderId]);

  const activeStatus = Math.min(5, Math.max(1, Number(tracker?.current_status ?? 1)));
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

  const formattedUpdatedTime = tracker?.updated_at
    ? new Date(tracker.updated_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

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
              {/* Top Companion Profile Card (Real DB Staff Name, Photo / Circular Placeholder & CPR ID) */}
              <div className="border-b border-slate-200 bg-slate-900 px-5 py-6 text-white sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                  <span className="font-mono tabular-nums text-emerald-300">
                    ORDER {tracker.order_id}
                  </span>
                  <span>{tracker.hospital_name || 'Klang Valley Hospital'}</span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  {/* Circular Staff Photo or Placeholder */}
                  {tracker.staff_photo_url && !photoFailed ? (
                    <img
                      src={tracker.staff_photo_url}
                      alt={tracker.staff_name}
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
                      {tracker.staff_name}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1 text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>CPR / First-Aid ID</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono font-medium tabular-nums text-white">
                        {tracker.staff_cpr_certificate_id}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Patient & Stage Summary Banner */}
                <div className="mt-5 flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-300">
                    Patient: <span className="font-semibold text-white">{tracker.client_name}</span>
                  </div>
                  <div className="text-xs font-medium text-emerald-300">
                    Status: {currentStage.title} · Updated {formattedUpdatedTime}
                  </div>
                </div>
              </div>

              {/* 5-Node Vertical Delivery-Style Timeline */}
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
                    <span>Step {activeStatus} of {TRACKER_STAGES.length}</span>
                  </button>
                </div>

                <ol className="relative space-y-0" aria-label="Live escort progress timeline">
                  {TRACKER_STAGES.map((stage, index) => {
                    const isCompleted = stage.status < activeStatus;
                    const isCurrent = stage.status === activeStatus;
                    const isPending = stage.status > activeStatus;
                    const isLast = index === TRACKER_STAGES.length - 1;
                    const StageIcon = stage.Icon;

                    return (
                      <li key={stage.status} className="relative flex gap-4 pb-7 last:pb-0">
                        {/* Vertical Connector Line */}
                        {!isLast && (
                          <span
                            aria-hidden="true"
                            className={`absolute left-[15px] top-8 bottom-0 w-0.5 transition-colors duration-200 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                            }`}
                          />
                        )}

                        {/* Timeline Status Node Circle */}
                        <div
                          aria-hidden="true"
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                            isCurrent
                              ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                              : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 stroke-[2.5]" />
                          ) : (
                            <StageIcon className="h-4 w-4" />
                          )}
                        </div>

                        {/* Timeline Node Copy */}
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex items-baseline justify-between gap-3">
                            <span
                              className={`font-display text-base font-semibold ${
                                isCurrent
                                  ? 'text-emerald-600'
                                  : isCompleted
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                              }`}
                            >
                              {stage.title}
                            </span>
                            <span
                              className={`font-mono text-xs tabular-nums shrink-0 ${
                                isPending ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              {isCurrent
                                ? formattedUpdatedTime
                                : isCompleted
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
