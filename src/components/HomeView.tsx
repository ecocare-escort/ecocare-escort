import { ArrowRight, Check, HeartHandshake, ShieldCheck, MessageSquare } from 'lucide-react';
import heroEscortImg from '../assets/images/hero_ecocare_escort_1794552794861.jpg';
import bentoHandoffImg from '../assets/images/bento_clinic_handoff_1794552796556.jpg';
import companionPortraitImg from '../assets/images/care_companion_portrait_1794552796355.jpg';
import { HERO_HIGHLIGHTS } from '../data/ecocareData';
import { ResilientImage } from './ResilientImage';
import { CustomerReviews } from './CustomerReviews';

export type AppView = 'home' | 'services' | 'book' | 'tracker' | 'faq' | 'portal';

interface HomeViewProps {
  onNavigate: (view: AppView) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <div className="flex flex-col justify-between lg:col-span-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="text-emerald-700">Based in Serdang, Malaysia</span>
                  <span aria-hidden="true">·</span>
                  <span>Serving Klang Valley</span>
                  <span aria-hidden="true">·</span>
                  <span>CPR &amp; First-Aid Certified</span>
                </div>

                <h1 className="mt-5 font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-slate-900 text-balance">
                  Trusted medical escort care for families across the Klang Valley.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                  EcoCare Escorts is a student-run social enterprise in Serdang. Our trained companions handle door-to-door transport, hospital registration queues, in-room doctor notes, and live WhatsApp updates so your parents never attend appointments alone.
                </p>
              </div>

              {/* Two Large CTA Buttons */}
              <div className="mt-8 flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <button
                  type="button"
                  onClick={() => onNavigate('book')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-emerald-700 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  <span>Book Now</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40 hover:text-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                >
                  <span>View Our Services</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-96 lg:h-full lg:min-h-[420px]">
                <ResilientImage
                  src={heroEscortImg}
                  alt="EcoCare companion in an emerald blazer greeting and assisting a senior patient outside a hospital entrance"
                  className="h-full w-full object-cover"
                  fallbackTitle="EcoCare Escorts · Serdang & Klang Valley"
                  fallbackSubtitle="Door-to-door hospital accompaniment by CPR & First-Aid certified student companions."
                />
              </div>
            </div>
          </div>

          {/* 4-Column Operational Highlights */}
          <div className="mt-12 grid grid-cols-1 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
            {HERO_HIGHLIGHTS.map((item) => (
              <div key={item.label} className="p-6">
                <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                  {item.value}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.context}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Intro Section */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-emerald-700">
                Why Choose Us
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 text-balance">
                Compassionate student companions built for Malaysian hospital visits
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-600">
              Designed for working adults whose parents need patient, bilingual support across Serdang, Putrajaya, KL, and PJ hospitals.
            </p>
          </div>

          {/* Three Core Pillars */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <ShieldCheck className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
                CPR &amp; First-Aid Certified
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Every EcoCare student companion is vetted, trained in basic life support, and experienced in safe senior mobility assistance.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <HeartHandshake className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
                Multilingual Clinic Wayfinding
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Clear communication at registration counters, labs, and pharmacies in English, Bahasa Melayu, and Mandarin.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <MessageSquare className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">
                Live Updates While You Work
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Follow every milestone on our 5-step Live Tracker and receive clear doctor notes and prescription photos via WhatsApp.
              </p>
            </div>
          </div>

          {/* Editorial Companion Visuals */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-12 md:items-stretch">
                <div className="h-60 md:col-span-6 md:h-auto">
                  <ResilientImage
                    src={bentoHandoffImg}
                    alt="EcoCare student companion walking alongside an older patient through a bright hospital corridor"
                    className="h-full w-full object-cover"
                    fallbackTitle="Hospital Corridor Navigation"
                    fallbackSubtitle="Counter queueing, lab wayfinding, and steady walking support."
                  />
                </div>
                <div className="flex flex-col justify-between p-6 md:col-span-6 md:p-8">
                  <div>
                    <p className="text-xs font-medium text-emerald-700">
                      Door-to-Door Accompaniment
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-900">
                      From your living room to the clinic room and safely back home
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      Unlike ordinary e-hailing rides that stop at the lobby or guardhouse, EcoCare stays beside your parent through registration, blood tests, doctor consultation, and pharmacy collection.
                    </p>
                  </div>
                  <ul className="mt-5 space-y-1.5 text-xs text-slate-700">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Serdang, Putrajaya, KL City, PJ &amp; Subang coverage</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                      <span>Transparent flat packages starting at RM 100</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="h-56 w-full overflow-hidden">
                <ResilientImage
                  src={companionPortraitImg}
                  alt="Portrait of a certified EcoCare student care coordinator holding a tablet"
                  className="h-full w-full object-cover object-top"
                  fallbackTitle="Student Care Companion"
                  fallbackSubtitle="CPR & First-Aid certified university team based in Serdang."
                />
              </div>
              <div className="p-6">
                <p className="text-xs font-medium text-emerald-700">
                  Serdang Student Care Team
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  Every EcoCare escort is a trained university student companion certified in CPR and First-Aid by St. John Ambulance Malaysia.
                </p>
                <p className="mt-3 text-xs font-semibold text-slate-900">
                  Serdang Base · Klang Valley Coverage
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Home Action Callout */}
          <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-xl border border-slate-200 bg-white p-7 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-xl font-semibold text-slate-900">
                Ready to arrange your parent’s next hospital visit?
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Compare Tier 1 (RM 100) and Tier 2 (RM 150) packages or jump straight into booking.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('services')}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-emerald-700 hover:text-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                View Our Services
              </button>
              <button
                type="button"
                onClick={() => onNavigate('book')}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      </section>

      <CustomerReviews />
    </>
  );
}
