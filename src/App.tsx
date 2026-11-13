import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { HomeView, type AppView } from './components/HomeView';
import { ServicesView } from './components/ServicesView';
import { FAQView } from './components/FAQView';
import { EmployeePortal } from './components/EmployeePortal';
import {
  BookingSection,
  type BookingPrefill,
  type PricingTier,
} from './components/BookingSection';
import {
  LiveTrackerPage,
  type TrackedBookingInfo,
} from './components/LiveTrackerPage';
import { Footer } from './components/Footer';

interface RouteState {
  view: AppView;
  orderId?: string;
}

function parseRoute(): RouteState {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.replace('#', '').toLowerCase();

  if (path === '/portal' || hash === 'portal') {
    return { view: 'portal' };
  }
  if (path.startsWith('/track/')) {
    const id = decodeURIComponent(window.location.pathname.slice('/track/'.length)).trim();
    return { view: 'tracker', orderId: id || 'ECE-842190' };
  }
  if (hash.startsWith('track/')) {
    const id = decodeURIComponent(window.location.hash.slice('#track/'.length)).trim();
    return { view: 'tracker', orderId: id || 'ECE-842190' };
  }
  if (path === '/services' || hash === 'services') return { view: 'services' };
  if (path === '/book' || hash === 'book') return { view: 'book' };
  if (path === '/faq' || hash === 'faq') return { view: 'faq' };
  if (path === '/tracker' || hash === 'tracker') {
    return { view: 'tracker', orderId: 'ECE-842190' };
  }
  return { view: 'home' };
}

export default function App() {
  const [route, setRoute] = useState<RouteState>(() => parseRoute());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | null>(null);
  const [trackedBooking, setTrackedBooking] = useState<TrackedBookingInfo | null>(null);

  useEffect(() => {
    const syncRoute = () => setRoute(parseRoute());
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const navigateTo = (view: AppView, orderId?: string) => {
    setMobileMenuOpen(false);
    const targetOrderId =
      view === 'tracker'
        ? orderId || trackedBooking?.bookingId || route.orderId || 'ECE-842190'
        : undefined;

    setRoute({ view, orderId: targetOrderId });

    const targetPath =
      view === 'home'
        ? '/'
        : view === 'tracker'
          ? `/track/${encodeURIComponent(targetOrderId || 'ECE-842190')}`
          : `/${view}`;

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPackage = (tierId: PricingTier) => {
    setBookingPrefill({ tierId });
    navigateTo('book');
  };

  const handleOpenTracker = (info?: TrackedBookingInfo) => {
    if (info) setTrackedBooking(info);
    navigateTo('tracker', info?.bookingId);
  };

  const activeView = route.view;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Global Sticky Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
          {/* Left: Brand Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            EcoCare Escorts
          </button>

          {/* Right: Navigation Menu (Home | Services & Pricing | Live Tracker | FAQ | [Book Now]) */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => navigateTo('home')}
              aria-current={activeView === 'home' ? 'page' : undefined}
              className={`transition-colors whitespace-nowrap shrink-0 hover:underline hover:underline-offset-4 ${
                activeView === 'home'
                  ? 'font-semibold text-emerald-700 underline underline-offset-4'
                  : 'hover:text-slate-900'
              }`}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() => navigateTo('services')}
              aria-current={activeView === 'services' ? 'page' : undefined}
              className={`transition-colors whitespace-nowrap shrink-0 hover:underline hover:underline-offset-4 ${
                activeView === 'services'
                  ? 'font-semibold text-emerald-700 underline underline-offset-4'
                  : 'hover:text-slate-900'
              }`}
            >
              Services &amp; Pricing
            </button>

            <button
              type="button"
              onClick={() => navigateTo('tracker')}
              aria-current={activeView === 'tracker' ? 'page' : undefined}
              className={`transition-colors whitespace-nowrap shrink-0 hover:underline hover:underline-offset-4 ${
                activeView === 'tracker'
                  ? 'font-semibold text-emerald-700 underline underline-offset-4'
                  : 'hover:text-slate-900'
              }`}
            >
              Live Tracker
            </button>

            <button
              type="button"
              onClick={() => navigateTo('faq')}
              aria-current={activeView === 'faq' ? 'page' : undefined}
              className={`transition-colors whitespace-nowrap shrink-0 hover:underline hover:underline-offset-4 ${
                activeView === 'faq'
                  ? 'font-semibold text-emerald-700 underline underline-offset-4'
                  : 'hover:text-slate-900'
              }`}
            >
              FAQ
            </button>

            <button
              type="button"
              onClick={() => navigateTo('book')}
              aria-current={activeView === 'book' ? 'page' : undefined}
              className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${
                activeView === 'book'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
              }`}
            >
              Book Now
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <nav aria-label="Mobile navigation" className="flex flex-col gap-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeView === 'home'
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateTo('services')}
                className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeView === 'services'
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Services &amp; Pricing
              </button>
              <button
                type="button"
                onClick={() => navigateTo('tracker')}
                className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeView === 'tracker'
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Live Tracker
              </button>
              <button
                type="button"
                onClick={() => navigateTo('faq')}
                className={`rounded-lg px-3 py-2.5 text-left transition-colors ${
                  activeView === 'faq'
                    ? 'bg-emerald-50 font-semibold text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                FAQ
              </button>
              <button
                type="button"
                onClick={() => navigateTo('book')}
                className="mt-1 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-emerald-800 whitespace-nowrap shrink-0"
              >
                Book Now
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Active View Content */}
      <main id="top" className="flex-1">
        {activeView === 'home' && <HomeView onNavigate={(v) => navigateTo(v)} />}

        {activeView === 'services' && (
          <ServicesView
            onSelectPackage={handleSelectPackage}
            onGoToBooking={() => navigateTo('book')}
          />
        )}

        {activeView === 'book' && (
          <BookingSection
            prefill={bookingPrefill}
            onOpenTracker={(info) => handleOpenTracker(info)}
          />
        )}

        {activeView === 'tracker' && (
          <LiveTrackerPage
            orderId={route.orderId}
            bookingInfo={trackedBooking}
            onSelectOrderId={(id) => navigateTo('tracker', id)}
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {activeView === 'portal' && (
          <EmployeePortal
            onOpenClientTracker={(id) => navigateTo('tracker', id)}
            onBackToHome={() => navigateTo('home')}
          />
        )}

        {activeView === 'faq' && <FAQView onNavigate={(v) => navigateTo(v)} />}
      </main>

      {/* Global High-Contrast Dark Footer */}
      <Footer onNavigate={(v) => navigateTo(v)} />
    </div>
  );
}
