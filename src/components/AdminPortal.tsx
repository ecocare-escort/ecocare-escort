import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  LogOut,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from 'lucide-react';

interface StaffRecord {
  id: string;
  name: string;
  role: string;
  phone: string;
  photo_url: string | null;
  cpr_certificate_id: string;
}

interface AdminPortalProps {
  onBackToPortal: () => void;
  onBackToHome: () => void;
}

const ADMIN_SESSION_KEY = 'ecocare_admin_passcode';

async function parseJsonSafe(response: Response) {
  const rawText = await response.text();
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return { error: rawText.trim().slice(0, 140) || 'Unexpected server response.' };
  }
}

export function AdminPortal({ onBackToPortal, onBackToHome }: AdminPortalProps) {
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [verifiedPasscode, setVerifiedPasscode] = useState<string | null>(null);
  const [verifyingSession, setVerifyingSession] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  // Add New Staff Form state
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('Care Companion');
  const [phone, setPhone] = useState<string>('');
  const [cprCertificateId, setCprCertificateId] = useState<string>('');
  const [addingStaff, setAddingStaff] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline Remove confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStaffDirectory = useCallback(async (passcode?: string) => {
    setLoadingStaff(true);
    setListError(null);
    try {
      const headers: Record<string, string> = {};
      if (passcode) {
        headers['x-admin-passcode'] = passcode;
      }
      const url = passcode ? '/api/staff?verify=1' : '/api/staff';
      const response = await fetch(url, { headers });
      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load staff directory.');
      }

      setStaffList((data?.staff || []) as StaffRecord[]);
      return true;
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : 'Unable to fetch staff directory.'
      );
      return false;
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  // Restore saved sessionStorage passcode on mount
  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const stored = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (!stored) {
          if (active) setVerifyingSession(false);
          return;
        }
        const response = await fetch('/api/staff?verify=1', {
          headers: { 'x-admin-passcode': stored },
        });
        const data = await parseJsonSafe(response);
        if (!active) return;

        if (response.ok && data?.staff) {
          setVerifiedPasscode(stored);
          setStaffList(data.staff as StaffRecord[]);
        } else {
          window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch {
        window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      } finally {
        if (active) setVerifyingSession(false);
      }
    };

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = passcodeInput.trim();
    if (!candidate) {
      setAuthError('Please enter the admin passcode.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/staff?verify=1', {
        headers: { 'x-admin-passcode': candidate },
      });
      const data = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(data?.error || 'Invalid admin passcode.');
      }

      window.sessionStorage.setItem(ADMIN_SESSION_KEY, candidate);
      setVerifiedPasscode(candidate);
      setStaffList((data?.staff || []) as StaffRecord[]);
      setPasscodeInput('');
      setActionFeedback(null);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to verify admin passcode.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setVerifiedPasscode(null);
    setStaffList([]);
    setPasscodeInput('');
    setAuthError(null);
    setActionFeedback(null);
    setConfirmDeleteId(null);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPasscode || addingStaff) return;

    const trimmedName = name.trim();
    const trimmedRole = role.trim() || 'Care Companion';
    const trimmedPhone = phone.trim();
    const trimmedCpr = cprCertificateId.trim();

    if (!trimmedName || !trimmedPhone || !trimmedCpr) {
      setFormError('Full Name, Phone, and CPR Certificate ID are required.');
      return;
    }

    setAddingStaff(true);
    setFormError(null);
    setActionFeedback(null);

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': verifiedPasscode,
        },
        body: JSON.stringify({
          name: trimmedName,
          role: trimmedRole,
          phone: trimmedPhone,
          cpr_certificate_id: trimmedCpr,
        }),
      });
      const data = await parseJsonSafe(response);

      if (response.status === 401) {
        handleSignOut();
        setAuthError('Admin session expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add staff member.');
      }

      setName('');
      setRole('Care Companion');
      setPhone('');
      setCprCertificateId('');
      setActionFeedback(`Added ${trimmedName} to the EcoCare staff directory.`);
      await fetchStaffDirectory(verifiedPasscode);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save new staff member.'
      );
    } finally {
      setAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (staff: StaffRecord) => {
    if (!verifiedPasscode || deletingId) return;

    setDeletingId(staff.id);
    setListError(null);
    setActionFeedback(null);

    try {
      const response = await fetch(
        `/api/staff?id=${encodeURIComponent(staff.id)}`,
        {
          method: 'DELETE',
          headers: {
            'x-admin-passcode': verifiedPasscode,
          },
        }
      );
      const data = await parseJsonSafe(response);

      if (response.status === 401) {
        handleSignOut();
        setAuthError('Admin session expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to remove staff member.');
      }

      setConfirmDeleteId(null);
      setActionFeedback(
        `Removed ${staff.name}. Any linked orders were safely reset to pending dispatch.`
      );
      await fetchStaffDirectory(verifiedPasscode);
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : 'Unable to remove staff member.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section
      aria-label="Admin Staff Management Portal"
      className="min-h-[calc(100vh-4rem)] bg-slate-100 px-4 py-8 sm:px-6 sm:py-12"
    >
      <div className="mx-auto w-full max-w-5xl">
        {/* Top Utility Navigation */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBackToPortal}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Employee Portal</span>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              Back to Home
            </button>
          </div>

          {verifiedPasscode && (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {verifyingSession ? (
          <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
            <RefreshCw
              className="mx-auto h-6 w-6 animate-spin text-emerald-700"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Checking admin session...
            </p>
          </div>
        ) : !verifiedPasscode ? (
          /* Admin Login Gate */
          <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
              <span>EcoCare Operations</span>
            </div>

            <h1 className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900">
              Admin Staff Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Sign in with your administrator passcode to add or remove care companions in Turso.
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
                  htmlFor="admin-passcode"
                  className="block text-sm font-medium text-slate-800"
                >
                  Admin Passcode
                </label>
                <input
                  id="admin-passcode"
                  type="password"
                  autoComplete="current-password"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter admin passcode"
                  className="mt-1.5 min-h-[48px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Demo passcode for MVP testing:{' '}
                  <span className="font-mono font-medium text-slate-700">
                    ecocare2026
                  </span>
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="min-h-[48px] w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
              >
                {authLoading ? 'Verifying...' : 'Unlock Admin Dashboard'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Staff Directory & Management Dashboard */
          <div className="space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Admin Console · Turso Staff Directory</span>
                </div>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
                  Staff Directory &amp; Access Control
                </h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  Changes made here immediately update companion accounts in the Employee Portal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchStaffDirectory(verifiedPasscode)}
                disabled={loadingStaff}
                className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:self-center"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingStaff ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>Refresh List</span>
              </button>
            </div>

            {actionFeedback && (
              <div
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-700"
                    aria-hidden="true"
                  />
                  <span>{actionFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
              {/* Left Column: Add New Staff Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Add New Staff
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Creates a certified companion profile with default portal passcode{' '}
                  <span className="font-mono text-slate-700">123456</span>.
                </p>

                {formError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                  >
                    {formError}
                  </p>
                )}

                <form onSubmit={handleAddStaff} className="mt-4 space-y-4">
                  <div>
                    <label
                      htmlFor="admin-staff-name"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Full Name *
                    </label>
                    <input
                      id="admin-staff-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g., Nurul Aina"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-staff-role"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Role
                    </label>
                    <input
                      id="admin-staff-role"
                      type="text"
                      list="ecocare-staff-roles"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Care Companion"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    <datalist id="ecocare-staff-roles">
                      <option value="Care Companion" />
                      <option value="Senior Care Companion" />
                      <option value="Medical Escort Lead" />
                    </datalist>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-staff-phone"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Phone *
                    </label>
                    <input
                      id="admin-staff-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="+60 12-345 6789"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="admin-staff-cpr"
                      className="block text-xs font-medium text-slate-700"
                    >
                      CPR Certificate ID *
                    </label>
                    <input
                      id="admin-staff-cpr"
                      type="text"
                      value={cprCertificateId}
                      onChange={(e) => {
                        setCprCertificateId(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      placeholder="SJAM-CPR-20888"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingStaff}
                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{addingStaff ? 'Adding Staff...' : 'Add Staff Member'}</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Existing Staff Directory */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    Active Care Companions
                  </h2>
                  <span className="font-mono text-xs tabular-nums text-slate-500">
                    {staffList.length} total
                  </span>
                </div>

                {listError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                  >
                    {listError}
                  </p>
                )}

                {loadingStaff && staffList.length === 0 ? (
                  <div className="mt-4 space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-20 animate-pulse rounded-lg border border-slate-100 bg-slate-50"
                      />
                    ))}
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="mt-6 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center">
                    <User
                      className="mx-auto h-7 w-7 text-slate-300"
                      aria-hidden="true"
                    />
                    <p className="mt-2 text-sm font-medium text-slate-700">
                      No staff members in directory
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Use the form on the left to add your first certified care companion.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {staffList.map((member) => {
                      const avatarBroken = Boolean(failedAvatars[member.id]);
                      const isConfirming = confirmDeleteId === member.id;
                      const isDeleting = deletingId === member.id;

                      return (
                        <li
                          key={member.id}
                          className="flex flex-col gap-3 py-4 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3.5">
                            {member.photo_url && !avatarBroken ? (
                              <img
                                src={member.photo_url}
                                alt={member.name}
                                referrerPolicy="no-referrer"
                                onError={() =>
                                  setFailedAvatars((prev) => ({
                                    ...prev,
                                    [member.id]: true,
                                  }))
                                }
                                className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover"
                              />
                            ) : (
                              <div
                                aria-label="Staff avatar placeholder"
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-emerald-700"
                              >
                                <User className="h-5 w-5" aria-hidden="true" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <span className="truncate font-display text-sm font-semibold text-slate-900">
                                  {member.name}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="text-xs text-slate-600">
                                  {member.role}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700">
                                  <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                  {member.phone}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-emerald-800">
                                  <ShieldCheck className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                                  {member.cpr_certificate_id}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {isConfirming ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => handleRemoveStaff(member)}
                                  className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                >
                                  {isDeleting ? 'Removing...' : 'Confirm Remove'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(member.id)}
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Remove</span>
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
