import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lock,
  LogOut,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  Upload,
  User,
} from 'lucide-react';

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  phone: string;
  photo_url: string;
  cpr_certificate_id: string;
}

interface OrderRecord {
  order_id: string;
  client_name: string;
  hospital_name: string | null;
  pickup_time: string | null;
  staff_id: string;
  current_status: number;
  updated_at: string;
}

interface MockCredentialAccount {
  password: string;
  staff: StaffProfile;
}

const DEFAULT_PENDING_ORDERS: OrderRecord[] = [
  {
    order_id: 'ECE-8421',
    client_name: 'Mdm. Tan Siew Lan',
    hospital_name: 'Hospital Serdang',
    pickup_time: '09:00 AM',
    staff_id: 'unassigned',
    current_status: 1,
    updated_at: new Date().toISOString(),
  },
  {
    order_id: 'ECE-8425',
    client_name: 'En. Ahmad Zaki',
    hospital_name: 'Hospital Putrajaya',
    pickup_time: '10:30 AM',
    staff_id: 'unassigned',
    current_status: 1,
    updated_at: new Date().toISOString(),
  },
  {
    order_id: 'ECE-8430',
    client_name: 'Mdm. Lim Poh Choo',
    hospital_name: 'UMMC',
    pickup_time: '11:15 AM',
    staff_id: 'unassigned',
    current_status: 1,
    updated_at: new Date().toISOString(),
  },
];

const STAFF_ACCOUNTS: Record<string, MockCredentialAccount> = {
  donghao: {
    password: '123456',
    staff: {
      id: 'staff-dong-hao',
      name: 'Dong Hao',
      role: 'Senior Care Companion',
      phone: '+60 12-345 6789',
      photo_url:
        'https://ui-avatars.com/api/?name=Dong+Hao&background=047857&color=ffffff&bold=true',
      cpr_certificate_id: 'SJAM-CPR-20612',
    },
  },
  yenchi: {
    password: '123456',
    staff: {
      id: 'staff-yenchi',
      name: 'Yenchi',
      role: 'Care Companion',
      phone: '+60 12-678 9012',
      photo_url:
        'https://ui-avatars.com/api/?name=Yenchi&background=0f766e&color=ffffff&bold=true',
      cpr_certificate_id: 'SJAM-CPR-20705',
    },
  },
  meiling: {
    password: '123456',
    staff: {
      id: 'staff-mei-ling',
      name: 'Mei Ling Tan',
      role: 'Senior Care Companion',
      phone: '+60 12-456 7890',
      photo_url:
        'https://ui-avatars.com/api/?name=Mei+Ling+Tan&background=047857&color=ffffff&bold=true',
      cpr_certificate_id: 'SJAM-CPR-20489',
    },
  },
  amirul: {
    password: '123456',
    staff: {
      id: 'staff-amirul',
      name: 'Amirul Hakim',
      role: 'Care Companion',
      phone: '+60 12-890 1234',
      photo_url:
        'https://ui-avatars.com/api/?name=Amirul+Hakim&background=0f766e&color=ffffff&bold=true',
      cpr_certificate_id: 'SJAM-CPR-20514',
    },
  },
};

const STATUS_BUTTONS = [
  { status: 1, label: 'Assigned' },
  { status: 2, label: 'En Route' },
  { status: 3, label: 'In Queue' },
  { status: 4, label: 'Pharmacy' },
  { status: 5, label: 'Heading Home' },
];

function formatPendingOptionLabel(order: OrderRecord): string {
  const shortNumber = order.order_id.replace(/^ECE-/, '');
  return `Order #${shortNumber} - ${order.client_name} - ${order.hospital_name || 'Klang Valley'}`;
}

interface EmployeePortalProps {
  onOpenClientTracker: (orderId: string) => void;
  onBackToHome: () => void;
}

export function EmployeePortal({
  onOpenClientTracker,
  onBackToHome,
}: EmployeePortalProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [loggedInStaff, setLoggedInStaff] = useState<StaffProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<OrderRecord[]>(
    DEFAULT_PENDING_ORDERS
  );
  const [selectedPendingId, setSelectedPendingId] = useState<string>(
    DEFAULT_PENDING_ORDERS[0].order_id
  );
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);

  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(false);
  const [claimingOrder, setClaimingOrder] = useState<boolean>(false);
  const [releasingOrder, setReleasingOrder] = useState<boolean>(false);
  const [completingOrder, setCompletingOrder] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [photoFailed, setPhotoFailed] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completionToast, setCompletionToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editPhotoPreviewFailed, setEditPhotoPreviewFailed] = useState<boolean>(false);
  const [selectedPhotoName, setSelectedPhotoName] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editCprId, setEditCprId] = useState<string>('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const loadDashboardData = async (account: MockCredentialAccount) => {
    setLoadingDashboard(true);
    setPhotoFailed(false);
    try {
      const [staffOrdersRes, pendingRes] = await Promise.all([
        fetch(`/api/orders?staff_id=${encodeURIComponent(account.staff.id)}`),
        fetch('/api/pending-orders'),
      ]);

      if (staffOrdersRes.ok) {
        const staffData = await staffOrdersRes.json();
        if (staffData.staff) {
          setLoggedInStaff({
            ...account.staff,
            ...staffData.staff,
            phone: staffData.staff.phone || account.staff.phone,
            photo_url: staffData.staff.photo_url || account.staff.photo_url,
          });
        }
        setActiveOrder((staffData.activeOrder as OrderRecord | null) ?? null);
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        const dbPending = (pendingData.pendingOrders || []) as OrderRecord[];
        const nextPending =
          dbPending.length > 0 ? dbPending : DEFAULT_PENDING_ORDERS;
        setPendingOrders(nextPending);
        setSelectedPendingId((prev) =>
          nextPending.some((o) => o.order_id === prev)
            ? prev
            : nextPending[0]?.order_id ?? ''
        );
      }
    } catch {
      // Keep local fallback state cleanly if offline
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setFeedback(null);

    const normalizedUsername = username.trim().toLowerCase();
    const account = STAFF_ACCOUNTS[normalizedUsername];

    if (!account || password !== account.password) {
      setAuthError('Invalid Staff ID or Password.');
      return;
    }

    setLoggedInStaff(account.staff);
    setActiveOrder(null);
    await loadDashboardData(account);
  };

  const handleLogout = () => {
    setLoggedInStaff(null);
    setActiveOrder(null);
    setUsername('');
    setPassword('');
    setAuthError(null);
    setFeedback(null);
    setPhotoFailed(false);
    setIsEditingProfile(false);
    setProfileError(null);
  };

  const handleStartEditProfile = () => {
    if (!loggedInStaff) return;
    setEditPhotoUrl(loggedInStaff.photo_url || '');
    setEditPhotoPreviewFailed(false);
    setSelectedPhotoName(null);
    setEditName(loggedInStaff.name);
    setEditPhone(loggedInStaff.phone);
    setEditCprId(loggedInStaff.cpr_certificate_id);
    setProfileError(null);
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    if (
      pendingObjectUrlRef.current &&
      pendingObjectUrlRef.current !== loggedInStaff?.photo_url
    ) {
      URL.revokeObjectURL(pendingObjectUrlRef.current);
    }
    pendingObjectUrlRef.current = null;
    setProfileError(null);
    setSelectedPhotoName(null);
    setIsEditingProfile(false);
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      pendingObjectUrlRef.current &&
      pendingObjectUrlRef.current !== loggedInStaff?.photo_url
    ) {
      URL.revokeObjectURL(pendingObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    pendingObjectUrlRef.current = objectUrl;
    setEditPhotoUrl(objectUrl);
    setEditPhotoPreviewFailed(false);
    setSelectedPhotoName(file.name);
    e.target.value = '';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInStaff || savingProfile) return;

    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();
    const trimmedCprId = editCprId.trim();
    const trimmedPhotoUrl = editPhotoUrl.trim();

    if (!trimmedName || !trimmedPhone || !trimmedCprId) {
      setProfileError(
        'Full Name, Phone Number, and CPR Certificate ID are required.'
      );
      return;
    }

    setProfileError(null);
    setSavingProfile(true);
    pendingObjectUrlRef.current = null;

    const updatedProfile: StaffProfile = {
      ...loggedInStaff,
      name: trimmedName,
      phone: trimmedPhone,
      photo_url: trimmedPhotoUrl,
      cpr_certificate_id: trimmedCprId,
    };

    // Update local React state immediately so dashboard reflects changes right away
    setLoggedInStaff(updatedProfile);
    setPhotoFailed(false);
    setSelectedPhotoName(null);
    setIsEditingProfile(false);

    try {
      const persistedPhotoUrl = trimmedPhotoUrl.startsWith('blob:')
        ? loggedInStaff.photo_url.startsWith('blob:')
          ? ''
          : loggedInStaff.photo_url
        : trimmedPhotoUrl;

      await fetch('/api/update-staff-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedProfile,
          photo_url: persistedPhotoUrl,
        }),
      });
    } catch {
      // Local state already updated cleanly for offline/prototype use
    } finally {
      setSavingProfile(false);
    }
  };

  const handleClaimOrder = async () => {
    if (!loggedInStaff || !selectedPendingId || claimingOrder) return;
    const chosenOrder = pendingOrders.find(
      (o) => o.order_id === selectedPendingId
    );
    if (!chosenOrder) return;

    setClaimingOrder(true);
    setFeedback(null);

    const now = new Date().toISOString();
    let claimedRecord: OrderRecord = {
      ...chosenOrder,
      staff_id: loggedInStaff.id,
      current_status: 1,
      updated_at: now,
    };

    try {
      const response = await fetch('/api/claim-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: chosenOrder.order_id,
          staff_id: loggedInStaff.id,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.order) {
          claimedRecord = data.order as OrderRecord;
        }
      }
    } catch {
      // Fallback to local state if offline
    } finally {
      setActiveOrder(claimedRecord);
      setPendingOrders((prev) => {
        const remaining = prev.filter(
          (o) => o.order_id !== chosenOrder.order_id
        );
        setSelectedPendingId(remaining[0]?.order_id ?? '');
        return remaining;
      });
      setFeedback(`Order ${claimedRecord.order_id} claimed. Status updates unlocked.`);
      setClaimingOrder(false);
    }
  };

  const handleReleaseOrder = async () => {
    if (!activeOrder || releasingOrder) return;
    const orderToRelease = activeOrder;

    setReleasingOrder(true);
    setFeedback(null);

    try {
      await fetch('/api/release-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderToRelease.order_id,
        }),
      });
    } catch {
      // Fallback to local state if offline
    } finally {
      const releasedRecord: OrderRecord = {
        ...orderToRelease,
        staff_id: 'unassigned',
        current_status: 1,
        updated_at: new Date().toISOString(),
      };
      setActiveOrder(null);
      setPendingOrders((prev) => {
        const exists = prev.some((o) => o.order_id === releasedRecord.order_id);
        const updated = exists ? prev : [releasedRecord, ...prev];
        setSelectedPendingId(releasedRecord.order_id);
        return updated;
      });
      setFeedback(`Released ${orderToRelease.order_id} back to pending orders.`);
      setReleasingOrder(false);
    }
  };

  const handleUpdateStatus = async (status: number) => {
    if (!activeOrder || updatingStatus !== null || completingOrder) return;
    setUpdatingStatus(status);
    setFeedback(null);

    const nextUpdatedAt = new Date().toISOString();
    const statusLabel =
      STATUS_BUTTONS.find((b) => b.status === status)?.label ?? `Step ${status}`;

    setActiveOrder((prev) =>
      prev
        ? {
            ...prev,
            current_status: status,
            updated_at: nextUpdatedAt,
          }
        : null
    );

    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: activeOrder.order_id,
          current_status: status,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const savedAt = data.updated_at || nextUpdatedAt;
        setActiveOrder((prev) =>
          prev ? { ...prev, updated_at: savedAt } : null
        );
      }
    } catch {
      // Optimistic state retained
    } finally {
      const timeFormatted = new Date(nextUpdatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setFeedback(`Status updated to ${status}. ${statusLabel} (${timeFormatted})`);
      setUpdatingStatus(null);
    }
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder || completingOrder || updatingStatus !== null) return;
    const completedOrder = activeOrder;

    setCompletingOrder(true);
    setFeedback(null);

    try {
      await fetch('/api/complete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: completedOrder.order_id,
        }),
      });
    } catch {
      // Proceed cleanly with local completion reset if offline
    } finally {
      setActiveOrder(null);
      setCompletingOrder(false);
      setCompletionToast(
        `Order ${completedOrder.order_id} completed successfully!`
      );

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setCompletionToast(null);
      }, 4500);
    }
  };

  const formattedUpdatedTime = activeOrder?.updated_at
    ? new Date(activeOrder.updated_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  return (
    <section
      aria-label="Employee Portal"
      className="min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-6 sm:px-6 sm:py-12"
    >
      <div className="mx-auto w-full max-w-md">
        {/* Top Utility Bar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>

          {loggedInStaff && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Log Out</span>
            </button>
          )}
        </div>

        {/* Manual Username / Password Login View */}
        {!loggedInStaff ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>Internal Companion Access</span>
            </div>

            <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900">
              Staff Login
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Enter your assigned EcoCare Staff ID and password to claim an escort task.
            </p>

            {authError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="staff-username"
                  className="block text-sm font-medium text-slate-800"
                >
                  Username
                </label>
                <input
                  id="staff-username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter staff username"
                  className="mt-1.5 min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-password"
                  className="block text-sm font-medium text-slate-800"
                >
                  Password
                </label>
                <input
                  id="staff-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter password"
                  className="mt-1.5 min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
              </div>

              <button
                type="submit"
                className="min-h-[48px] w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                Sign In
              </button>
            </form>
          </div>
        ) : (
          /* Personalized Employee Dashboard (Post-Login) */
          <div className="space-y-4">
            {/* 1. Rich Staff Profile Section (Display Mode vs Edit Mode) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              {!isEditingProfile ? (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    {loggedInStaff.photo_url && !photoFailed ? (
                      <img
                        src={loggedInStaff.photo_url}
                        alt={loggedInStaff.name}
                        referrerPolicy="no-referrer"
                        onError={() => setPhotoFailed(true)}
                        className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div
                        aria-label="Staff profile photo placeholder"
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-emerald-700"
                      >
                        <User className="h-6 w-6" aria-hidden="true" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h1 className="truncate font-display text-lg font-bold text-slate-900">
                        {loggedInStaff.name}
                      </h1>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {loggedInStaff.role}
                      </p>

                      <div className="mt-2 flex flex-col gap-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                          <span className="font-mono tabular-nums text-slate-700">
                            {loggedInStaff.cpr_certificate_id}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Phone
                            className="h-3.5 w-3.5 shrink-0 text-slate-500"
                            aria-hidden="true"
                          />
                          <a
                            href={`tel:${loggedInStaff.phone.replace(/\s+/g, '')}`}
                            className="font-mono tabular-nums text-slate-800 hover:text-emerald-700 hover:underline"
                          >
                            {loggedInStaff.phone}
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartEditProfile}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <h2 className="font-display text-sm font-semibold text-slate-900">
                      Edit Profile
                    </h2>
                    <span className="text-xs text-slate-500">
                      {loggedInStaff.role}
                    </span>
                  </div>

                  {profileError && (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                      {profileError}
                    </p>
                  )}

                  {/* Profile Picture Upload & Circular Preview */}
                  <div>
                    <span className="block text-xs font-medium text-slate-700">
                      Profile Picture
                    </span>
                    <div className="mt-2 flex items-center gap-4">
                      {editPhotoUrl && !editPhotoPreviewFailed ? (
                        <img
                          src={editPhotoUrl}
                          alt={editName || loggedInStaff.name}
                          referrerPolicy="no-referrer"
                          onError={() => setEditPhotoPreviewFailed(true)}
                          className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div
                          aria-label="Profile picture preview placeholder"
                          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-emerald-700"
                        >
                          <User className="h-8 w-8" aria-hidden="true" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <input
                          ref={fileInputRef}
                          id="edit-photo-file"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40 hover:text-emerald-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                        >
                          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Upload Photo</span>
                        </button>
                        <p className="mt-1.5 truncate text-xs text-slate-500">
                          {selectedPhotoName
                            ? `Selected: ${selectedPhotoName}`
                            : 'JPG or PNG image from your device'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-full-name"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Full Name
                    </label>
                    <input
                      id="edit-full-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Full Name"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-phone"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Phone Number
                    </label>
                    <input
                      id="edit-phone"
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+60 12-345 6789"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="edit-cpr-id"
                      className="block text-xs font-medium text-slate-700"
                    >
                      CPR Certificate ID
                    </label>
                    <input
                      id="edit-cpr-id"
                      type="text"
                      value={editCprId}
                      onChange={(e) => setEditCprId(e.target.value)}
                      placeholder="SJAM-CPR-20612"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="min-h-[44px] flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditProfile}
                      disabled={savingProfile}
                      className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Temporary Completion Toast */}
            {completionToast && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <span>{completionToast}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletionToast(null)}
                  className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 2. Order Claiming Workflow (State A vs State B) */}
            {!activeOrder ? (
              /* State A: No active task — Select & Claim a Paid Pending Order */
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold text-slate-500">
                    Dispatch Pool
                  </h2>
                  <button
                    type="button"
                    aria-label="Refresh pending orders"
                    onClick={() => {
                      const matched = Object.values(STAFF_ACCOUNTS).find(
                        (a) => a.staff.id === loggedInStaff.id
                      );
                      if (matched) loadDashboardData(matched);
                    }}
                    disabled={loadingDashboard}
                    className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingDashboard ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div className="mt-2.5">
                  <label
                    htmlFor="pending-orders-select"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Available Pending Orders
                  </label>
                  <select
                    id="pending-orders-select"
                    value={selectedPendingId}
                    onChange={(e) => setSelectedPendingId(e.target.value)}
                    disabled={pendingOrders.length === 0 || claimingOrder}
                    className="mt-2 min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  >
                    {pendingOrders.length === 0 ? (
                      <option value="">No pending orders available</option>
                    ) : (
                      pendingOrders.map((order) => (
                        <option key={order.order_id} value={order.order_id}>
                          {formatPendingOptionLabel(order)}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleClaimOrder}
                  disabled={!selectedPendingId || pendingOrders.length === 0 || claimingOrder}
                  className="mt-3 min-h-[48px] w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  {claimingOrder ? 'Claiming Order...' : 'Claim Order'}
                </button>
              </div>
            ) : (
              /* State B: Task Claimed — Locked Active Task Card */
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs font-semibold text-slate-500">
                      Active Task
                    </h2>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-mono text-xs tabular-nums text-slate-600">
                      {activeOrder.order_id}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleReleaseOrder}
                    disabled={releasingOrder || updatingStatus !== null}
                    className="min-h-[36px] rounded px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                  >
                    {releasingOrder ? 'Releasing...' : 'Release Order'}
                  </button>
                </div>

                <p className="mt-2 font-display text-base font-semibold leading-snug text-slate-900">
                  {activeOrder.client_name} -{' '}
                  {activeOrder.hospital_name || 'Klang Valley Hospital'}
                  {activeOrder.pickup_time ? (
                    <>
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-slate-700">
                        {activeOrder.pickup_time}
                      </span>
                    </>
                  ) : null}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="font-mono tabular-nums">
                    Updated {formattedUpdatedTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenClientTracker(activeOrder.order_id)}
                    className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    <span>View Live Tracker</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* 3. Status Update Buttons (Active ONLY in State B) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold text-slate-500">
                  Update Trip Status
                </h2>
                {!activeOrder && (
                  <span className="text-xs text-slate-400">Locked</span>
                )}
              </div>

              {!activeOrder && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Claim a pending order above to unlock the 5 status buttons.
                </p>
              )}

              <div className="mt-3 flex flex-col gap-2.5">
                {STATUS_BUTTONS.map((btn) => {
                  const isActive =
                    Boolean(activeOrder) && activeOrder?.current_status === btn.status;
                  const isUpdating = updatingStatus === btn.status;
                  const isDisabled =
                    !activeOrder || updatingStatus !== null || completingOrder;

                  return (
                    <button
                      key={btn.status}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleUpdateStatus(btn.status)}
                      aria-pressed={isActive}
                      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                        !activeOrder
                          ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                          : isActive
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-slate-300 bg-white text-slate-900 hover:border-emerald-700 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-60'
                      }`}
                    >
                      <span className="font-display text-sm font-semibold whitespace-nowrap">
                        <span className="font-mono tabular-nums mr-1.5">
                          {btn.status}.
                        </span>
                        {isUpdating ? 'Updating...' : btn.label}
                      </span>

                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-100 whitespace-nowrap shrink-0">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span>Current</span>
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* 6. Order Completed — Final Closing Action */}
                <button
                  type="button"
                  disabled={!activeOrder || updatingStatus !== null || completingOrder}
                  onClick={handleCompleteOrder}
                  className={`mt-1 flex min-h-[54px] w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                    !activeOrder
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
                  }`}
                >
                  <span className="font-display text-sm font-semibold whitespace-nowrap">
                    <span className="font-mono tabular-nums mr-1.5">6.</span>
                    {completingOrder ? 'Completing Order...' : 'Order Completed'}
                  </span>
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      activeOrder ? 'text-emerald-400' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {feedback && (
                <p
                  role="status"
                  className="mt-3 text-xs font-medium text-emerald-700"
                >
                  {feedback}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
