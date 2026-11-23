import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Car,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { formatMalaysiaPhone } from '../utils/formatMalaysiaPhone';
import { compressImageToDataUrl } from '../utils/compressAvatar';

interface StaffRecord {
  id: string;
  name: string;
  role: string;
  phone: string;
  photo_url: string | null;
  cpr_certificate_id: string;
  login_id?: string | null;
  passcode?: string | null;
  is_driver?: number | boolean;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  vehicle_plate?: string | null;
}

interface OrderMonitorRecord {
  order_id: string;
  client_name: string;
  hospital_name: string | null;
  pickup_time: string | null;
  staff_id: string;
  driver_id: string | null;
  current_status: number;
  updated_at: string;
  completed_at: string | null;
  companion_name: string | null;
  companion_phone: string | null;
  driver_name: string | null;
  driver_vehicle_model: string | null;
  driver_vehicle_plate: string | null;
}

type AdminTab = 'staff' | 'orders';

const ORDER_STATUS_META: Record<number, { label: string; badgeClass: string; barClass: string }> = {
  1: {
    label: 'Assigned / Pending',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    barClass: 'bg-amber-500',
  },
  2: {
    label: 'En Route',
    badgeClass: 'border-sky-200 bg-sky-50 text-sky-800',
    barClass: 'bg-sky-600',
  },
  3: {
    label: 'In Queue',
    badgeClass: 'border-indigo-200 bg-indigo-50 text-indigo-800',
    barClass: 'bg-indigo-600',
  },
  4: {
    label: 'Pharmacy',
    badgeClass: 'border-teal-200 bg-teal-50 text-teal-800',
    barClass: 'bg-teal-600',
  },
  5: {
    label: 'Heading Home',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    barClass: 'bg-emerald-600',
  },
  6: {
    label: 'Completed',
    badgeClass: 'border-emerald-300 bg-emerald-100 text-emerald-900',
    barClass: 'bg-emerald-700',
  },
};

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
  const [showAdminPasscode, setShowAdminPasscode] = useState<boolean>(false);
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
  const [loginId, setLoginId] = useState<string>('');
  const [staffPasscode, setStaffPasscode] = useState<string>('');
  const [showAddPasscode, setShowAddPasscode] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [addPreviewFailed, setAddPreviewFailed] = useState<boolean>(false);
  const [compressingAddPhoto, setCompressingAddPhoto] = useState<boolean>(false);
  const [addingStaff, setAddingStaff] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState<boolean>(false);
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleColor, setVehicleColor] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const addFileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Staff Modal state
  const [editingStaff, setEditingStaff] = useState<StaffRecord | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editRole, setEditRole] = useState<string>('Care Companion');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editCprId, setEditCprId] = useState<string>('');
  const [editLoginId, setEditLoginId] = useState<string>('');
  const [editPasscode, setEditPasscode] = useState<string>('');
  const [showEditPasscode, setShowEditPasscode] = useState<boolean>(false);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editPreviewFailed, setEditPreviewFailed] = useState<boolean>(false);
  const [compressingEditPhoto, setCompressingEditPhoto] = useState<boolean>(false);
  const [editIsDriver, setEditIsDriver] = useState<boolean>(false);
  const [editVehicleModel, setEditVehicleModel] = useState<string>('');
  const [editVehicleColor, setEditVehicleColor] = useState<string>('');
  const [editVehiclePlate, setEditVehiclePlate] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline Remove staff confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Admin Tab & Order Management state
  const [activeTab, setActiveTab] = useState<AdminTab>('staff');
  const [orders, setOrders] = useState<OrderMonitorRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

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
      setFailedAvatars({});
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

  const fetchOrders = useCallback(async (passcode: string) => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const response = await fetch('/api/orders', {
        headers: { 'x-admin-passcode': passcode },
      });
      const data = await parseJsonSafe(response);

      if (response.status === 401) {
        window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
        setVerifiedPasscode(null);
        setAuthError('Admin session expired. Please sign in again.');
        return false;
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load orders from Turso.');
      }

      setOrders((data?.orders || []) as OrderMonitorRecord[]);
      return true;
    } catch (err) {
      setOrdersError(
        err instanceof Error ? err.message : 'Unable to fetch orders.'
      );
      return false;
    } finally {
      setLoadingOrders(false);
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
          fetchOrders(stored);
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
  }, [fetchOrders]);

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
      fetchOrders(candidate);
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
    setOrders([]);
    setPasscodeInput('');
    setAuthError(null);
    setActionFeedback(null);
    setConfirmDeleteId(null);
    setConfirmDeleteOrderId(null);
    setEditingStaff(null);
  };

  const handleAddAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCompressingAddPhoto(true);
    setFormError(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 200);
      setPhotoUrl(compressedDataUrl);
      setAddPreviewFailed(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to process selected image.'
      );
    } finally {
      setCompressingAddPhoto(false);
    }
  };

  const handleEditAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCompressingEditPhoto(true);
    setEditError(null);
    try {
      const compressedDataUrl = await compressImageToDataUrl(file, 200);
      setEditPhotoUrl(compressedDataUrl);
      setEditPreviewFailed(false);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to process selected image.'
      );
    } finally {
      setCompressingEditPhoto(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPasscode || addingStaff) return;

    const trimmedName = name.trim();
    const trimmedRole = role.trim() || 'Care Companion';
    const formattedPhone = formatMalaysiaPhone(phone);
    const trimmedCpr = cprCertificateId.trim();
    const trimmedLoginId = loginId.trim().toLowerCase().replace(/\s+/g, '');
    const trimmedPasscode = staffPasscode.trim() || '123456';
    const trimmedPhotoUrl = photoUrl.trim();
    const trimmedVehicleModel = vehicleModel.trim();
    const trimmedVehicleColor = vehicleColor.trim();
    const formattedPlate = vehiclePlate.trim().toUpperCase();

    setPhone(formattedPhone);
    setVehiclePlate(formattedPlate);

    if (!trimmedName || !formattedPhone || !trimmedCpr) {
      setFormError('Full Name, Phone, and CPR Certificate ID are required.');
      return;
    }

    if (isDriver && (!trimmedVehicleModel || !formattedPlate)) {
      setFormError('Vehicle Model and Plate Number are required for designated drivers.');
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
          phone: formattedPhone,
          cpr_certificate_id: trimmedCpr,
          photo_url: trimmedPhotoUrl,
          login_id: trimmedLoginId,
          passcode: trimmedPasscode,
          is_driver: isDriver ? 1 : 0,
          vehicle_model: isDriver ? trimmedVehicleModel : null,
          vehicle_color: isDriver ? trimmedVehicleColor : null,
          vehicle_plate: isDriver ? formattedPlate : null,
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
      setLoginId('');
      setStaffPasscode('');
      setPhotoUrl('');
      setAddPreviewFailed(false);
      setIsDriver(false);
      setVehicleModel('');
      setVehicleColor('');
      setVehiclePlate('');
      setActionFeedback(
        `Added ${trimmedName} (Login ID: ${data?.staff?.login_id || trimmedLoginId || 'auto'}) to Turso.`
      );
      await fetchStaffDirectory(verifiedPasscode);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save new staff member.'
      );
    } finally {
      setAddingStaff(false);
    }
  };

  const openEditModal = (member: StaffRecord) => {
    setEditingStaff(member);
    setEditName(member.name || '');
    setEditRole(member.role || 'Care Companion');
    setEditPhone(formatMalaysiaPhone(member.phone || ''));
    setEditCprId(member.cpr_certificate_id || '');
    setEditLoginId(member.login_id || '');
    setEditPasscode(member.passcode || '123456');
    setShowEditPasscode(false);
    setEditPhotoUrl(member.photo_url || '');
    setEditPreviewFailed(false);
    setEditIsDriver(Boolean(Number(member.is_driver || 0)));
    setEditVehicleModel(member.vehicle_model || '');
    setEditVehicleColor(member.vehicle_color || '');
    setEditVehiclePlate(member.vehicle_plate || '');
    setEditError(null);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedPasscode || !editingStaff || savingEdit) return;

    const trimmedName = editName.trim();
    const trimmedRole = editRole.trim() || 'Care Companion';
    const formattedPhone = formatMalaysiaPhone(editPhone);
    const trimmedCpr = editCprId.trim();
    const trimmedLogin = editLoginId.trim().toLowerCase().replace(/\s+/g, '');
    const trimmedPasscode = editPasscode.trim();
    const trimmedPhoto = editPhotoUrl.trim();
    const trimmedEditModel = editVehicleModel.trim();
    const trimmedEditColor = editVehicleColor.trim();
    const formattedEditPlate = editVehiclePlate.trim().toUpperCase();

    setEditPhone(formattedPhone);
    setEditVehiclePlate(formattedEditPlate);

    if (!trimmedName || !formattedPhone || !trimmedCpr || !trimmedLogin || !trimmedPasscode) {
      setEditError(
        'Full Name, Phone, CPR Certificate ID, Login ID, and Passcode are all required.'
      );
      return;
    }

    if (editIsDriver && (!trimmedEditModel || !formattedEditPlate)) {
      setEditError('Vehicle Model and Plate Number are required for designated drivers.');
      return;
    }

    setSavingEdit(true);
    setEditError(null);
    setActionFeedback(null);

    try {
      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': verifiedPasscode,
        },
        body: JSON.stringify({
          id: editingStaff.id,
          name: trimmedName,
          role: trimmedRole,
          phone: formattedPhone,
          cpr_certificate_id: trimmedCpr,
          photo_url: trimmedPhoto,
          login_id: trimmedLogin,
          passcode: trimmedPasscode,
          is_driver: editIsDriver ? 1 : 0,
          vehicle_model: editIsDriver ? trimmedEditModel : null,
          vehicle_color: editIsDriver ? trimmedEditColor : null,
          vehicle_plate: editIsDriver ? formattedEditPlate : null,
        }),
      });
      const data = await parseJsonSafe(response);

      if (response.status === 401) {
        setEditingStaff(null);
        handleSignOut();
        setAuthError('Admin session expired. Please sign in again.');
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update staff member.');
      }

      setEditingStaff(null);
      setActionFeedback(`Updated profile & credentials for ${trimmedName}.`);
      await fetchStaffDirectory(verifiedPasscode);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unable to update staff record.'
      );
    } finally {
      setSavingEdit(false);
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

  const handleDeleteOrder = async (orderId: string) => {
    if (!verifiedPasscode || deletingOrderId) return;

    setDeletingOrderId(orderId);
    setOrdersError(null);
    setActionFeedback(null);

    try {
      const response = await fetch(
        `/api/orders?order_id=${encodeURIComponent(orderId)}`,
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
        throw new Error(data?.error || 'Failed to delete order.');
      }

      setOrders((prev) =>
        prev.filter((o) => o.order_id.toUpperCase() !== orderId.toUpperCase())
      );
      setConfirmDeleteOrderId(null);
      setActionFeedback(`Permanently deleted order ${orderId} from Turso.`);
    } catch (err) {
      setOrdersError(
        err instanceof Error ? err.message : 'Unable to delete order.'
      );
    } finally {
      setDeletingOrderId(null);
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
              Sign in with your administrator passcode to add, edit, or remove care companions in Turso.
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
                <div className="relative mt-1.5">
                  <input
                    id="admin-passcode"
                    type={showAdminPasscode ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passcodeInput}
                    onChange={(e) => {
                      setPasscodeInput(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="Enter admin passcode"
                    className="min-h-[48px] w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-11 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                  <button
                    type="button"
                    aria-label={showAdminPasscode ? 'Hide admin passcode' : 'Show admin passcode'}
                    onClick={() => setShowAdminPasscode((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    {showAdminPasscode ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
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
          /* Authenticated Staff Directory & Order Management Dashboard */
          <div className="space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                    {activeTab === 'staff' ? (
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>
                      Admin Console ·{' '}
                      {activeTab === 'staff'
                        ? 'Turso Staff Directory'
                        : 'Live Order Monitor'}
                    </span>
                  </div>
                  <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900">
                    {activeTab === 'staff'
                      ? 'Staff Directory & Access Control'
                      : 'Order Management & Live Progress'}
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {activeTab === 'staff'
                      ? 'Changes made here immediately update companion profiles, driver dispatch pools, and portal credentials.'
                      : 'Monitor real-time escort stages across all orders and permanently clean up test or obsolete bookings.'}
                  </p>
                </div>

                {activeTab === 'staff' ? (
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
                ) : (
                  <button
                    type="button"
                    onClick={() => fetchOrders(verifiedPasscode)}
                    disabled={loadingOrders}
                    className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 sm:self-center"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loadingOrders ? 'animate-spin' : ''}`}
                      aria-hidden="true"
                    />
                    <span>Refresh Orders</span>
                  </button>
                )}
              </div>

              {/* Tab Switcher */}
              <div
                role="tablist"
                aria-label="Admin management sections"
                className="flex flex-wrap gap-2 border-t border-slate-100 pt-3.5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'staff'}
                  onClick={() => setActiveTab('staff')}
                  className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    activeTab === 'staff'
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Staff Directory &amp; Access Control</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      activeTab === 'staff'
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {staffList.length}
                  </span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'orders'}
                  onClick={() => {
                    setActiveTab('orders');
                    if (verifiedPasscode) fetchOrders(verifiedPasscode);
                  }}
                  className={`inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    activeTab === 'orders'
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Order Management &amp; Live Progress</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] tabular-nums ${
                      activeTab === 'orders'
                        ? 'bg-emerald-800 text-emerald-100'
                        : 'bg-white text-slate-600'
                    }`}
                  >
                    {orders.length}
                  </span>
                </button>
              </div>
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

            {activeTab === 'staff' ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
              {/* Left Column: Add New Staff Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5">
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Add New Staff
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a compressed avatar or paste a URL, and set their Employee Portal credentials.
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
                  {/* Avatar Upload + URL + Live Circular Preview */}
                  <div>
                    <span className="block text-xs font-medium text-slate-700">
                      Profile Avatar (Optional)
                    </span>
                    <div className="mt-2 flex items-center gap-3.5">
                      {photoUrl && !addPreviewFailed ? (
                        <img
                          src={photoUrl}
                          alt={name || 'Staff avatar preview'}
                          referrerPolicy="no-referrer"
                          onError={() => setAddPreviewFailed(true)}
                          className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
                        />
                      ) : (
                        <div
                          aria-label="Avatar preview placeholder"
                          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-emerald-700"
                        >
                          <User className="h-7 w-7" aria-hidden="true" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <input
                          ref={addFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAddAvatarFile}
                          className="hidden"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={compressingAddPhoto}
                            onClick={() => addFileInputRef.current?.click()}
                            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-50 whitespace-nowrap"
                          >
                            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>
                              {compressingAddPhoto ? 'Resizing...' : 'Upload Photo'}
                            </span>
                          </button>

                          {photoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoUrl('');
                                setAddPreviewFailed(false);
                              }}
                              className="text-xs text-slate-500 hover:text-red-600 hover:underline"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={photoUrl}
                          onChange={(e) => {
                            setPhotoUrl(e.target.value);
                            setAddPreviewFailed(false);
                          }}
                          placeholder="Or paste image URL (auto-avatar if blank)"
                          aria-label="Profile avatar URL"
                          className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  </div>

                  <div>
                    <label
                      htmlFor="admin-staff-phone"
                      className="block text-xs font-medium text-slate-700"
                    >
                      Phone (Malaysian Auto-Format) *
                    </label>
                    <input
                      id="admin-staff-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      onBlur={() => setPhone((prev) => formatMalaysiaPhone(prev))}
                      placeholder="01123464017 or 0123456789"
                      className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="admin-staff-login-id"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Login ID
                      </label>
                      <input
                        id="admin-staff-login-id"
                        type="text"
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={loginId}
                        onChange={(e) => {
                          setLoginId(e.target.value);
                          if (formError) setFormError(null);
                        }}
                        placeholder="Auto from name if blank"
                        className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="admin-staff-passcode"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Portal Passcode
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="admin-staff-passcode"
                          type={showAddPasscode ? 'text' : 'password'}
                          value={staffPasscode}
                          onChange={(e) => setStaffPasscode(e.target.value)}
                          placeholder="Enter portal passcode"
                          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                        />
                        <button
                          type="button"
                          aria-label={showAddPasscode ? 'Hide passcode' : 'Show passcode'}
                          onClick={() => setShowAddPasscode((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                        >
                          {showAddPasscode ? (
                            <EyeOff className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Designated Driver Toggle & Vehicle Details */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isDriver}
                        onChange={(e) => {
                          setIsDriver(e.target.checked);
                          if (formError) setFormError(null);
                        }}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                      />
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <Car className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                        <span>Designated Driver (Auto-Dispatch Pool)</span>
                      </span>
                    </label>

                    {isDriver && (
                      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                        <div className="sm:col-span-3">
                          <label
                            htmlFor="admin-vehicle-model"
                            className="block text-xs font-medium text-slate-700"
                          >
                            Vehicle Model *
                          </label>
                          <input
                            id="admin-vehicle-model"
                            type="text"
                            value={vehicleModel}
                            onChange={(e) => setVehicleModel(e.target.value)}
                            placeholder="e.g., Proton Waja 1.6"
                            className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label
                            htmlFor="admin-vehicle-color"
                            className="block text-xs font-medium text-slate-700"
                          >
                            Vehicle Color
                          </label>
                          <input
                            id="admin-vehicle-color"
                            type="text"
                            value={vehicleColor}
                            onChange={(e) => setVehicleColor(e.target.value)}
                            placeholder="e.g., Silver"
                            className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="admin-vehicle-plate"
                            className="block text-xs font-medium text-slate-700"
                          >
                            Plate Number *
                          </label>
                          <input
                            id="admin-vehicle-plate"
                            type="text"
                            value={vehiclePlate}
                            onChange={(e) =>
                              setVehiclePlate(e.target.value.toUpperCase())
                            }
                            placeholder="e.g., WXY 1234"
                            className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={addingStaff || compressingAddPhoto}
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
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="truncate font-display text-sm font-semibold text-slate-900">
                                  {member.name}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="text-xs text-slate-600">
                                  {member.role}
                                </span>
                                {Boolean(Number(member.is_driver || 0)) && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                    <Car className="h-3 w-3 shrink-0" aria-hidden="true" />
                                    <span>Driver</span>
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                                {member.login_id && (
                                  <>
                                    <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                                      <KeyRound className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                      {member.login_id}
                                    </span>
                                    <span aria-hidden="true" className="text-slate-300">
                                      ·
                                    </span>
                                  </>
                                )}
                                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-700">
                                  <Phone className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                  {formatMalaysiaPhone(member.phone)}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="inline-flex items-center gap-1 font-mono tabular-nums text-emerald-800">
                                  <ShieldCheck className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                                  {member.cpr_certificate_id}
                                </span>
                              </div>

                              {Boolean(Number(member.is_driver || 0)) &&
                                (member.vehicle_model || member.vehicle_plate) && (
                                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                    <Car className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                                    <span>
                                      {member.vehicle_model || 'Assigned Vehicle'}
                                      {member.vehicle_color ? ` (${member.vehicle_color})` : ''}
                                    </span>
                                    {member.vehicle_plate && (
                                      <>
                                        <span aria-hidden="true" className="text-slate-300">
                                          ·
                                        </span>
                                        <span className="font-mono font-semibold text-slate-900">
                                          {member.vehicle_plate}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
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
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(member)}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-700 hover:bg-emerald-50/50 hover:text-emerald-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(member.id)}
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Remove</span>
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
            ) : (
              /* Tab 2: Order Management & Live Progress Monitor */
              <div className="space-y-6">
                {(() => {
                  const totalOrders = orders.length;
                  const completedCount = orders.filter(
                    (o) => Number(o.current_status) === 6 || Boolean(o.completed_at)
                  ).length;
                  const pendingUnassignedCount = orders.filter(
                    (o) =>
                      Number(o.current_status) < 6 &&
                      !o.completed_at &&
                      (!o.staff_id || o.staff_id === 'unassigned')
                  ).length;
                  const inProgressCount = orders.filter(
                    (o) =>
                      !o.completed_at &&
                      Number(o.current_status) >= 2 &&
                      Number(o.current_status) <= 5
                  ).length;

                  return (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">
                          Total Orders
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-slate-900">
                          {totalOrders}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-xs font-medium text-amber-700">
                          Pending / Unassigned
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-amber-800">
                          {pendingUnassignedCount}
                        </p>
                      </div>

                      <div className="rounded-xl border border-sky-200 bg-white p-4">
                        <p className="text-xs font-medium text-sky-700">
                          In Progress (Steps 2–5)
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-sky-800">
                          {inProgressCount}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="text-xs font-medium text-emerald-700">
                          Completed (Step 6)
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold tabular-nums text-emerald-800">
                          {completedCount}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-900">
                        All Tracked Orders
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Ordered by most recently updated in Turso.
                      </p>
                    </div>
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {orders.length} records
                    </span>
                  </div>

                  {ordersError && (
                    <p
                      role="alert"
                      className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                    >
                      {ordersError}
                    </p>
                  )}

                  {loadingOrders && orders.length === 0 ? (
                    <div className="mt-4 space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-24 animate-pulse rounded-lg border border-slate-100 bg-slate-50"
                        />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="mt-6 rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center">
                      <ClipboardList
                        className="mx-auto h-7 w-7 text-slate-300"
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        No orders in database
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        New bookings from the Smart Booking Form will appear here automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 divide-y divide-slate-100">
                      {orders.map((order) => {
                        const stepNum = Math.min(
                          6,
                          Math.max(1, Number(order.current_status || 1))
                        );
                        const meta = ORDER_STATUS_META[stepNum] || ORDER_STATUS_META[1];
                        const progressPercent = Math.round((stepNum / 6) * 100);
                        const isConfirmingDelete = confirmDeleteOrderId === order.order_id;
                        const isDeleting = deletingOrderId === order.order_id;
                        const updatedLabel = order.updated_at
                          ? new Date(order.updated_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—';

                        return (
                          <div
                            key={order.order_id}
                            className="flex flex-col gap-4 py-4 first:pt-1 last:pb-1 lg:flex-row lg:items-center lg:justify-between"
                          >
                            {/* Order ID & Patient / Hospital */}
                            <div className="min-w-0 lg:w-[30%]">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                  {order.order_id}
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="truncate font-display text-sm font-semibold text-slate-800">
                                  {order.client_name}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-slate-600">
                                {order.hospital_name || 'Klang Valley Hospital'}
                                {order.pickup_time ? (
                                  <>
                                    <span aria-hidden="true" className="mx-1.5 text-slate-300">
                                      ·
                                    </span>
                                    <span className="font-mono tabular-nums">
                                      {order.pickup_time}
                                    </span>
                                  </>
                                ) : null}
                              </p>
                              <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-400">
                                Updated {updatedLabel}
                              </p>
                            </div>

                            {/* Progress Bar / Status Badge */}
                            <div className="lg:w-[26%]">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${meta.badgeClass}`}
                                >
                                  Step {stepNum}/6 · {meta.label}
                                </span>
                                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                                  {progressPercent}%
                                </span>
                              </div>
                              <div
                                aria-hidden="true"
                                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                              >
                                <div
                                  className={`h-full rounded-full transition-all ${meta.barClass}`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>

                            {/* Assigned Companion & Driver */}
                            <div className="space-y-1 text-xs lg:w-[26%]">
                              <div className="flex items-center gap-1.5 text-slate-700">
                                <User
                                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                                  aria-hidden="true"
                                />
                                <span className="text-slate-500">Companion:</span>
                                {order.companion_name ? (
                                  <span className="truncate font-medium text-slate-900">
                                    {order.companion_name}
                                  </span>
                                ) : (
                                  <span className="font-medium text-amber-700">
                                    Unassigned
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
                                <Car
                                  className="h-3.5 w-3.5 shrink-0 text-emerald-700"
                                  aria-hidden="true"
                                />
                                <span className="text-slate-500">Driver:</span>
                                {order.driver_name ? (
                                  <>
                                    <span className="truncate font-medium text-slate-900">
                                      {order.driver_name}
                                    </span>
                                    {order.driver_vehicle_plate && (
                                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800">
                                        {order.driver_vehicle_plate}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-400">Not assigned</span>
                                )}
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap items-center gap-2 lg:justify-end shrink-0">
                              <a
                                href={`/track/${encodeURIComponent(order.order_id)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-emerald-700 hover:bg-emerald-50/50 hover:text-emerald-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                              >
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>View Tracker</span>
                              </a>

                              {isConfirmingDelete ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteOrder(order.order_id)}
                                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                  >
                                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => setConfirmDeleteOrderId(null)}
                                    className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDeleteOrderId(order.order_id)
                                  }
                                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-staff-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
              <div>
                <h2
                  id="edit-staff-modal-title"
                  className="font-display text-lg font-bold text-slate-900"
                >
                  Edit Staff Member
                </h2>
                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  {editingStaff.id}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close edit modal"
                onClick={() => setEditingStaff(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {editError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
              >
                {editError}
              </p>
            )}

            <form onSubmit={handleSaveEditStaff} className="mt-4 space-y-4">
              {/* Avatar Upload + URL + Preview */}
              <div>
                <span className="block text-xs font-medium text-slate-700">
                  Profile Avatar
                </span>
                <div className="mt-2 flex items-center gap-4">
                  {editPhotoUrl && !editPreviewFailed ? (
                    <img
                      src={editPhotoUrl}
                      alt={editName || editingStaff.name}
                      referrerPolicy="no-referrer"
                      onError={() => setEditPreviewFailed(true)}
                      className="h-16 w-16 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div
                      aria-label="Avatar preview placeholder"
                      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-emerald-50 text-emerald-700"
                    >
                      <User className="h-7 w-7" aria-hidden="true" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditAvatarFile}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={compressingEditPhoto}
                        onClick={() => editFileInputRef.current?.click()}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-50 whitespace-nowrap"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {compressingEditPhoto ? 'Resizing...' : 'Upload Photo'}
                        </span>
                      </button>

                      {editPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditPhotoUrl('');
                            setEditPreviewFailed(false);
                          }}
                          className="text-xs text-slate-500 hover:text-red-600 hover:underline"
                        >
                          Use Default Avatar
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={editPhotoUrl}
                      onChange={(e) => {
                        setEditPhotoUrl(e.target.value);
                        setEditPreviewFailed(false);
                      }}
                      placeholder="Or paste image URL"
                      aria-label="Edit staff avatar URL"
                      className="min-h-[36px] w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-modal-name"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Full Name *
                  </label>
                  <input
                    id="edit-modal-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-modal-role"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Role
                  </label>
                  <input
                    id="edit-modal-role"
                    type="text"
                    list="ecocare-staff-roles"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-modal-phone"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Phone *
                  </label>
                  <input
                    id="edit-modal-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    onBlur={() => setEditPhone((prev) => formatMalaysiaPhone(prev))}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-modal-cpr"
                    className="block text-xs font-medium text-slate-700"
                  >
                    CPR Certificate ID *
                  </label>
                  <input
                    id="edit-modal-cpr"
                    type="text"
                    value={editCprId}
                    onChange={(e) => setEditCprId(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-modal-login-id"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Login ID *
                  </label>
                  <input
                    id="edit-modal-login-id"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={editLoginId}
                    onChange={(e) => setEditLoginId(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-modal-passcode"
                    className="block text-xs font-medium text-slate-700"
                  >
                    Portal Passcode *
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="edit-modal-passcode"
                      type={showEditPasscode ? 'text' : 'password'}
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-10 font-mono text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                    <button
                      type="button"
                      aria-label={showEditPasscode ? 'Hide passcode' : 'Show passcode'}
                      onClick={() => setShowEditPasscode((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    >
                      {showEditPasscode ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Modal: Designated Driver Toggle & Vehicle Details */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={editIsDriver}
                    onChange={(e) => {
                      setEditIsDriver(e.target.checked);
                      if (editError) setEditError(null);
                    }}
                    className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                  />
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Car className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    <span>Designated Driver (Auto-Dispatch Pool)</span>
                  </span>
                </label>

                {editIsDriver && (
                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <div className="sm:col-span-3">
                      <label
                        htmlFor="edit-vehicle-model"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Vehicle Model *
                      </label>
                      <input
                        id="edit-vehicle-model"
                        type="text"
                        value={editVehicleModel}
                        onChange={(e) => setEditVehicleModel(e.target.value)}
                        placeholder="e.g., Proton Waja 1.6"
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label
                        htmlFor="edit-vehicle-color"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Vehicle Color
                      </label>
                      <input
                        id="edit-vehicle-color"
                        type="text"
                        value={editVehicleColor}
                        onChange={(e) => setEditVehicleColor(e.target.value)}
                        placeholder="e.g., Silver"
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="edit-vehicle-plate"
                        className="block text-xs font-medium text-slate-700"
                      >
                        Plate Number *
                      </label>
                      <input
                        id="edit-vehicle-plate"
                        type="text"
                        value={editVehiclePlate}
                        onChange={(e) =>
                          setEditVehiclePlate(e.target.value.toUpperCase())
                        }
                        placeholder="e.g., WXY 1234"
                        className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingStaff(null)}
                  className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || compressingEditPhoto}
                  className="min-h-[44px] rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
