import { useState } from 'react';
import { ArrowRight, ChevronDown, Mail, PhoneCall } from 'lucide-react';
import { FAQ_ITEMS } from '../data/ecocareData';
import type { AppView } from './HomeView';

interface FAQViewProps {
  onNavigate: (view: AppView) => void;
}

export function FAQView({ onNavigate }: FAQViewProps) {
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQ_ITEMS[0].id);

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Page Heading & Direct Coordinator Support */}
          <div className="lg:col-span-5">
            <p className="text-xs font-medium tracking-wide text-emerald-700">
              Frequently Asked Questions
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,3.5vw,2.75rem)] font-bold tracking-tight text-slate-900 text-balance">
              Clear answers before you book
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Everything families in Serdang and the Klang Valley need to know about our 4-hour packages, in-room doctor proxy support, and companion safety training.
            </p>

            <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
              <div className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <div className="text-sm">
                  <span className="block font-semibold text-slate-900">
                    WhatsApp &amp; Coordinator Line
                  </span>
                  <a
                    href="tel:+60123456789"
                    className="font-mono tabular-nums text-slate-600 hover:text-emerald-700"
                  >
                    +60 12-345 6789
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <div className="text-sm">
                  <span className="block font-semibold text-slate-900">Email Support</span>
                  <a
                    href="mailto:ecocare.escort@gmail.com"
                    className="font-mono text-slate-600 hover:text-emerald-700"
                  >
                    ecocare.escort@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Accordion List */}
          <div className="lg:col-span-7">
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/50 px-6">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqId(isOpen ? null : item.id)}
                      className="flex w-full items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                    >
                      <span className="font-display text-base font-semibold text-slate-900 md:text-lg">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-emerald-700' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpen && (
                      <div className="pb-5 pr-6 text-sm leading-relaxed text-slate-600 md:text-base">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Callout Actions */}
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Ready to schedule an escort?
                </h2>
                <p className="mt-0.5 text-xs text-slate-600">
                  Compare RM 100 and RM 150 packages or complete your booking directly.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  Services &amp; Pricing
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('book')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                >
                  <span>Book Now</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
