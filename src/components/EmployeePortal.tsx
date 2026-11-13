import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';

interface OrderSummary {
  order_id: string;
  client_name: string;
  hospital_name: string | null;
  current_status: number;
  updated_at: string;
  staff_name: string;
}

interface EmployeePortalProps {
  onOpenClientTracker: (orderId: string) => void;
  onBackToHome: () => void;
}

const STATUS_BUTTONS = [
  { status: 1, label: '1. Assigned', description: 'Companion & vehicle confirmed' },
  { status: 2, label: '2. En Route', description: 'Heading to pickup / hospital' },
  { status: 3, label: '3. In Queue', description: 'Registered & waiting at clinic' },
  { status: 4, label: '4. Pharmacy', description: 'Collecting medication at pharmacy' },
  { status: 5, label: '5. Heading Home', description: 'Returning patient safely home' },
];

export function EmployeePortal({
  onOpenClientTracker,
  onBackToHome,
}: EmployeePortalProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load active orders.');
      }
      const list = (data.orders || []) as OrderSummary[];
      setOrders(list);
      if (list.length > 0 && !selectedOrderId) {
        setSelectedOrderId(list[0].order_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const selectedOrder = orders.find((o) => o.order_id === selectedOrderId) ?? null;

  const handleUpdateStatus = async (status: number) => {
    if (!selectedOrderId) return;
    setUpdatingStatus(status);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrderId,
          current_status: status,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status.');
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.order_id === selectedOrderId
            ? {
                ...order,
                current_status: status,
                updated_at: data.updated_at || new Date().toISOString(),
              }
            : order
        )
      );

      const statusLabel =
        STATUS_BUTTONS.find((b) => b.status === status)?.label ?? `Step ${status}`;
      setFeedback(`Updated ${selectedOrderId} to "${statusLabel}" in Turso SQL.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <section
      aria-label="Employee Status Portal"
      className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 sm:px-6 sm:py-14"
    >
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Home</span>
          </button>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh Orders</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <p className="text-xs font-medium tracking-wide text-emerald-700">
            Companion Dispatch · /portal
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900">
            Employee Status Update Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Select an active escort order below and tap a milestone button to persist the live progress state to Turso SQL.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"
            >
              {error}
            </div>
          )}

          {/* Active Order Dropdown */}
          <div className="mt-6">
            <label
              htmlFor="portal-order-select"
              className="block text-xs font-semibold text-slate-700"
            >
              Select Active Order (order_id)
            </label>
            <select
              id="portal-order-select"
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setFeedback(null);
              }}
              disabled={loading || orders.length === 0}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            >
              {orders.length === 0 ? (
                <option value="">
                  {loading ? 'Loading active orders...' : 'No active orders found'}
                </option>
              ) : (
                orders.map((order) => (
                  <option key={order.order_id} value={order.order_id}>
                    {order.order_id} — {order.client_name} (
                    {order.hospital_name || 'Klang Valley'}) · Step {order.current_status}/5
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Selected Order Summary */}
          {selectedOrder && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold text-emerald-700">
                    {selectedOrder.order_id}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {selectedOrder.client_name} · {selectedOrder.hospital_name || 'Hospital'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Assigned Companion: {selectedOrder.staff_name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenClientTracker(selectedOrder.order_id)}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg border border-emerald-700 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 whitespace-nowrap shrink-0 sm:self-auto"
                >
                  <span>View Client Tracker</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* 5 Status Update Buttons */}
          <div className="mt-6">
            <span className="block text-xs font-semibold text-slate-700">
              Update Order Status (POST /api/update-status)
            </span>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STATUS_BUTTONS.map((btn) => {
                const isActive = selectedOrder?.current_status === btn.status;
                const isUpdating = updatingStatus === btn.status;

                return (
                  <button
                    key={btn.status}
                    type="button"
                    disabled={!selectedOrder || updatingStatus !== null}
                    onClick={() => handleUpdateStatus(btn.status)}
                    className={`flex min-h-[56px] flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-emerald-600 hover:bg-emerald-50/60'
                    }`}
                  >
                    <span className="font-display text-sm font-semibold">
                      {isUpdating ? 'Updating...' : btn.label}
                    </span>
                    <span
                      className={`mt-0.5 text-xs ${
                        isActive ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {btn.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              <span>{feedback}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
