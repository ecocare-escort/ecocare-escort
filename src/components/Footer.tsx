import { Mail, Phone, MapPin } from 'lucide-react';
import type { AppView } from './HomeView';

interface FooterProps {
  onNavigate: (view: AppView) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-14 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Column 1: Brand, Trust Text & Social Media */}
          <div className="md:col-span-5">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-block text-left font-display text-xl font-bold tracking-tight text-white transition-colors hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              EcoCare Escorts
            </button>

            <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-300">
              Student-run Social Enterprise | CPR &amp; First-Aid Certified Companions
            </p>

            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              Compassionate door-to-door hospital accompaniment for families across Serdang, Putrajaya, Kuala Lumpur, Petaling Jaya, and Subang.
            </p>

            {/* Dedicated 4-Icon Social Media Section */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-400">
                Connect with EcoCare
              </p>
              <div className="mt-3 flex items-center gap-3">
                {/* Facebook */}
                <a
                  href="https://www.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="EcoCare Escorts on Facebook"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800 text-slate-300 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V5c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H7.7v3h2.6v8h3.2Z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="EcoCare Escorts on Instagram"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800 text-slate-300 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="EcoCare Escorts on TikTok"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800 text-slate-300 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.34 0 .66.06.96.16V9.01a6.3 6.3 0 0 0-.96-.08 6.34 6.34 0 0 0-6.34 6.35 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.35-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.03-.07Z" />
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://www.youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="EcoCare Escorts on YouTube"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800 text-slate-300 transition-colors hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path d="M23.5 6.2a3.01 3.01 0 0 0-2.12-2.13C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.57A3.01 3.01 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3.01 3.01 0 0 0 2.12 2.13c1.88.57 9.38.57 9.38.57s7.5 0 9.38-.57a3.01 3.01 0 0 0 2.12-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Page Navigation */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold text-slate-400">Navigation</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="transition-colors hover:text-white hover:underline hover:underline-offset-4"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="transition-colors hover:text-white hover:underline hover:underline-offset-4"
                >
                  Services &amp; Pricing
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('tracker')}
                  className="transition-colors hover:text-white hover:underline hover:underline-offset-4"
                >
                  Live Tracker
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('faq')}
                  className="transition-colors hover:text-white hover:underline hover:underline-offset-4"
                >
                  FAQ
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('book')}
                  className="font-medium text-emerald-300 transition-colors hover:text-emerald-200 hover:underline hover:underline-offset-4"
                >
                  Book Now
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Direct Contact Info */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold text-slate-400">
              Contact &amp; Dispatch
            </h3>
            <ul className="mt-4 space-y-3.5 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <div>
                  <span className="block text-xs text-slate-400">Email</span>
                  <a
                    href="mailto:ecocare.escort@gmail.com"
                    className="font-mono text-sm text-white transition-colors hover:text-emerald-300"
                  >
                    ecocare.escort@gmail.com
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <div>
                  <span className="block text-xs text-slate-400">
                    WhatsApp &amp; Coordinator Line
                  </span>
                  <a
                    href="tel:+60123456789"
                    className="font-mono text-sm tabular-nums text-white transition-colors hover:text-emerald-300"
                  >
                    +60 12-345 6789
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <div>
                  <span className="block text-xs text-slate-400">Operating Base</span>
                  <span className="text-sm text-slate-200">
                    Serdang, Selangor · Klang Valley
                  </span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Trust Bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p>© 2026 EcoCare Escorts. All rights reserved.</p>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              type="button"
              onClick={() => onNavigate('portal')}
              className="rounded text-xs text-slate-500/70 transition-colors hover:text-slate-300 focus-visible:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Staff Login
            </button>
          </div>
          <p className="text-slate-300">
            Student-run Social Enterprise | CPR &amp; First-Aid Certified Companions
          </p>
        </div>
      </div>
    </footer>
  );
}
