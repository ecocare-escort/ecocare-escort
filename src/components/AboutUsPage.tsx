import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  CarFront,
  Clock,
  ExternalLink,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { AppView } from './HomeView';

interface AboutUsPageProps {
  onNavigate: (view: AppView) => void;
}

interface PublicStaffMember {
  id: string;
  name: string;
  role: string;
  photo_url?: string | null;
  cpr_certificate_id: string;
  is_driver?: number;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
}

const OPERATIONS_HUB = {
  companyName: 'EcoCare Escorts (Serdang Operations Hub)',
  address: 'Jalan SP, Taman Serdang Perdana, 43300 Seri Kembangan, Selangor, Malaysia',
  coverage: 'Free mileage within Serdang (0–10 km) & Greater Klang Valley coverage',
  hours: 'Monday – Saturday, 7:00 AM – 6:00 PM',
  whatsappDisplay: '+60 12-345 6789',
  whatsappHref: 'https://wa.me/60123456789',
  email: 'care@ecocareescorts.my',
  mapsHref:
    'https://maps.google.com/?q=Jalan+SP,+Taman+Serdang+Perdana,+Seri+Kembangan,+Selangor',
};

function getInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'EC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AboutUsPage({ onNavigate }: AboutUsPageProps) {
  const [staffList, setStaffList] = useState<PublicStaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const fetchTeamDirectory = async () => {
    setLoadingStaff(true);
    setStaffError(null);
    try {
      const response = await fetch('/api/staff');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load EcoCare team directory.');
      }
      const rows = Array.isArray(data.staff) ? data.staff : [];
      // Map strictly to non-sensitive public fields and ensure 'unassigned' is never rendered
      const safeStaff: PublicStaffMember[] = rows
        .filter((item: Record<string, unknown>) => String(item.id || '') !== 'unassigned')
        .map((item: Record<string, unknown>) => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          role: String(item.role || 'Care Companion'),
          photo_url: typeof item.photo_url === 'string' ? item.photo_url : null,
          cpr_certificate_id: String(item.cpr_certificate_id || ''),
          is_driver: Number(item.is_driver || 0) === 1 ? 1 : 0,
          vehicle_model: typeof item.vehicle_model === 'string' ? item.vehicle_model : null,
          vehicle_color: typeof item.vehicle_color === 'string' ? item.vehicle_color : null,
        }));
      setStaffList(safeStaff);
    } catch (err) {
      setStaffError(
        err instanceof Error ? err.message : 'Failed to load team directory.'
      );
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchTeamDirectory();
  }, []);

  return (
    <div className="bg-slate-50">
      {/* 1. Hero & Social Mission Section */}
      <section className="border-b border-slate-200 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span className="text-emerald-700">Social Enterprise</span>
                <span aria-hidden="true">·</span>
                <span>Serdang, Selangor</span>
                <span aria-hidden="true">·</span>
                <span>Greater Klang Valley</span>
              </div>

              <h1 className="mt-4 font-display text-[clamp(2.25rem,4vw,3.35rem)] font-bold leading-[1.08] tracking-tight text-slate-900 text-balance">
                About EcoCare Escorts
              </h1>

              <p className="mt-3 font-display text-lg font-semibold text-emerald-700 md:text-xl">
                “Time for You, Care for Them.”
              </p>

              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
                Co-created by a 6-member founding team in Serdang, EcoCare Escorts was built to
                solve the real-world struggle of working families in the Greater Klang Valley caring
                for aging parents. We combine reliable, door-to-door hospital accompaniment by CPR
                and First-Aid certified companions with a social cross-subsidy model aligned with
                UN SDG 3 and UN SDG 10—where every 10 paid trips funds 1 free B40 senior escort.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('book')}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  <span>Book an Escort</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  Explore Packages
                </button>
              </div>
            </div>

            {/* Social Mission & UN SDG Alignment Panel */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-6 lg:col-span-5 md:p-7">
              <div className="flex items-center gap-2.5">
                <HeartHandshake className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Our Social Impact Model
                </h2>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="font-mono text-xs font-semibold tracking-wide text-emerald-800">
                  10 : 1 B40 SUBSIDY PLEDGE
                </p>
                <p className="mt-1.5 font-display text-base font-semibold text-slate-900">
                  Every 10 Paid Trips = 1 Free B40 Senior Escort
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Surplus revenue from standard family bookings directly funds fully subsidized
                  hospital accompaniment for underserved B40 elderly patients around Serdang and
                  the Klang Valley.
                </p>
              </div>

              <div className="mt-5 divide-y divide-slate-200 border-t border-slate-200">
                <div className="py-3.5">
                  <p className="text-xs font-semibold text-emerald-800">
                    UN SDG 3 · Good Health &amp; Well-Being
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Reducing missed follow-up appointments, medication misunderstandings, and
                    fall risks for elderly patients navigating complex hospital clinics.
                  </p>
                </div>
                <div className="pt-3.5">
                  <p className="text-xs font-semibold text-emerald-800">
                    UN SDG 10 · Reduced Inequalities
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Expanding equitable access to safe, bilingual medical accompaniment for
                    low-income B40 seniors while empowering university students with meaningful work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Company Address & Operations Hub */}
      <section className="border-b border-slate-200 py-14 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-medium tracking-wide text-emerald-700">
                  Headquarters &amp; Dispatch Base
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900">
                  {OPERATIONS_HUB.companyName}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Centrally stationed near Hospital Sultan Abdul Aziz Shah (HSAAS) and Hospital
                  Serdang for rapid morning dispatch across Serdang and Greater Klang Valley.
                </p>
              </div>

              <a
                href={OPERATIONS_HUB.mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 self-start rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <span>View on Google Maps</span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              </a>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-200 pt-7 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <MapPin className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>Operations Address</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-900">
                  {OPERATIONS_HUB.address}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <CarFront className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>Service Coverage</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-900">
                  {OPERATIONS_HUB.coverage}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>Operating Hours</span>
                </div>
                <p className="text-sm font-medium leading-relaxed text-slate-900">
                  {OPERATIONS_HUB.hours}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Phone className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span>Direct Contact</span>
                </div>
                <div className="space-y-1 text-sm">
                  <a
                    href={OPERATIONS_HUB.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-mono text-sm font-medium tabular-nums text-emerald-800 hover:underline"
                  >
                    WhatsApp {OPERATIONS_HUB.whatsappDisplay}
                  </a>
                  <a
                    href={`mailto:${OPERATIONS_HUB.email}`}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 hover:text-emerald-700 hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    <span>{OPERATIONS_HUB.email}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Visual Organisational Chart (6-Member Team) */}
      <section className="border-b border-slate-200 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-emerald-700">
              6-Member Founding Team &amp; Structure
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Organisational Chart
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
              A 4-tier leadership and dispatch structure uniting executive strategy, technology,
              fleet operations, social-impact finance, and frontline hospital care.
            </p>
          </div>

          <div className="mt-10">
            {/* Level 1 (Top): Founder & CEO */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm rounded-xl border border-emerald-700 bg-emerald-50/40 p-5 text-center">
                <p className="text-xs font-semibold text-emerald-800">
                  Founder &amp; CEO
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-slate-900">
                  Jia Yi
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Vision, Strategy &amp; Partnerships
                </p>
              </div>
            </div>

            {/* Tree Connector: Level 1 -> Level 2 */}
            <div className="mx-auto h-6 w-px bg-slate-300" aria-hidden="true" />
            <div className="hidden md:block" aria-hidden="true">
              <div
                className="mx-auto h-px bg-slate-300"
                style={{ width: 'calc(50% + 0.75rem)' }}
              />
              <div className="grid grid-cols-2 gap-6">
                <div className="flex justify-center">
                  <div className="h-6 w-px bg-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="h-6 w-px bg-slate-300" />
                </div>
              </div>
            </div>

            {/* Level 2 (Co-Founders — 2 branches under Level 1) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center md:text-left">
                <p className="text-xs font-semibold text-emerald-700">
                  Co-Founder &amp; CTO
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                  Dong Hao
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Platform Tech, Live Tracker &amp; Quality Assurance
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 text-center md:text-left">
                <p className="text-xs font-semibold text-emerald-700">
                  Co-Founder &amp; Head of Fleet &amp; Operations
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                  Jia Liang
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Dispatch Logistics, Fleet &amp; Safety
                </p>
              </div>
            </div>

            {/* Tree Connector: Level 2 -> Level 3 */}
            <div className="mx-auto h-6 w-px bg-slate-300 md:hidden" aria-hidden="true" />
            <div className="hidden md:block" aria-hidden="true">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
              </div>
              <div
                className="mx-auto h-px bg-slate-300"
                style={{ width: 'calc(50% + 0.75rem)' }}
              />
              <div className="mx-auto h-5 w-px bg-slate-300" />
              <div
                className="mx-auto h-px bg-slate-300"
                style={{ width: 'calc(66.6667% + 1rem)' }}
              />
              <div className="grid grid-cols-3 gap-6">
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
              </div>
            </div>

            {/* Level 3 (Departments — 3 branches under Level 2) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-emerald-700">
                  Head of Finance &amp; Impact
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                  Jun Xian
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Financial Modeling, Pricing &amp; B40 Subsidy Fund
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-emerald-700">
                  Marketing &amp; Brand Lead
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                  Kam Weng
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Brand Identity &amp; Digital Campaigns
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-emerald-700">
                  Marketing &amp; Outreach Lead
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                  Kong Hong
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  4Ps Strategy &amp; Community Partnerships
                </p>
              </div>
            </div>

            {/* Tree Connector: Level 3 -> Level 4 Frontline Operations Bar */}
            <div className="mx-auto h-6 w-px bg-slate-300 md:hidden" aria-hidden="true" />
            <div className="hidden md:block" aria-hidden="true">
              <div className="grid grid-cols-3 gap-6">
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="h-5 w-px bg-slate-300" />
                </div>
              </div>
              <div
                className="mx-auto h-px bg-slate-300"
                style={{ width: 'calc(66.6667% + 1rem)' }}
              />
              <div className="mx-auto h-6 w-px bg-slate-300" />
            </div>

            {/* Level 4 (Frontline Operations Bar at bottom) */}
            <div className="rounded-xl border border-emerald-200 bg-slate-50 p-5 md:p-6">
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-semibold text-emerald-800">
                    Frontline Care Team
                  </p>
                  <h3 className="mt-1 font-display text-base font-bold text-slate-900">
                    Certified Care Companions (CPR/First-Aid) &amp; 3-Vehicle Auto-Dispatch Fleet
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>St. John Ambulance Certified Escorts</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CarFront className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                    <span>3-Vehicle Auto-Dispatch Pool</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Active Care Team Directory (Live from Turso) */}
      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-emerald-700">
                Active Companions &amp; Drivers
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Meet Our Care Companions &amp; Drivers
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                Verified EcoCare Escorts companions and designated drivers currently active on our
                dispatch roster. Every companion holds active CPR and First-Aid certification.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Users className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              <span className="tabular-nums">
                {loadingStaff
                  ? 'Loading active roster...'
                  : `${staffList.length} Active Team ${staffList.length === 1 ? 'Member' : 'Members'}`}
              </span>
            </div>
          </div>

          {loadingStaff ? (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-slate-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/3 rounded bg-slate-200" />
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="mt-5 h-8 w-full rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : staffError ? (
            <div className="mt-10 rounded-xl border border-rose-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-rose-700">{staffError}</p>
              <button
                type="button"
                onClick={fetchTeamDirectory}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Retry Loading Team</span>
              </button>
            </div>
          ) : staffList.length === 0 ? (
            <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                Our team roster is currently being updated.
              </p>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {staffList.map((member) => {
                const isDriver = Number(member.is_driver || 0) === 1;
                const showFallback = !member.photo_url || failedImages[member.id];

                return (
                  <article
                    key={member.id}
                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-emerald-300"
                  >
                    <div className="flex items-start gap-4">
                      {showFallback ? (
                        <div
                          aria-hidden="true"
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-700 font-display text-sm font-bold text-white"
                        >
                          {getInitials(member.name)}
                        </div>
                      ) : (
                        <img
                          src={member.photo_url || ''}
                          alt={`${member.name} — ${member.role}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [member.id]: true }))
                          }
                          className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-base font-bold text-slate-900">
                          {member.name}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-emerald-700">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <Award className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
                        <span className="font-mono tabular-nums">
                          CPR ID: {member.cpr_certificate_id}
                        </span>
                      </div>

                      {isDriver && (
                        <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-900">
                          <CarFront
                            className="h-3.5 w-3.5 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            Designated Driver
                            {member.vehicle_model ? ` · ${member.vehicle_model}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
