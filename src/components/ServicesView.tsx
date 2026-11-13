import { useState } from 'react';
import { ArrowRight, Check, MapPin } from 'lucide-react';
import {
  ADDON_ITEMS,
  JOURNEY_PHASES,
  KLANG_VALLEY_ZONES,
  PRICING_PACKAGES,
} from '../data/ecocareData';
import type { PricingTier } from './BookingSection';

interface ServicesViewProps {
  onSelectPackage: (tierId: PricingTier) => void;
  onGoToBooking: () => void;
}

export function ServicesView({
  onSelectPackage,
  onGoToBooking,
}: ServicesViewProps) {
  const [activePhaseId, setActivePhaseId] = useState<string>(JOURNEY_PHASES[0].id);

  const activePhase =
    JOURNEY_PHASES.find((phase) => phase.id === activePhaseId) ?? JOURNEY_PHASES[0];

  return (
    <div className="bg-slate-50">
      {/* Services & Pricing Header + Package Cards */}
      <section className="border-b border-slate-200 bg-white py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wide text-emerald-700">
                Services &amp; Pricing
              </p>
              <h1 className="mt-2 font-display text-[clamp(2rem,3.5vw,2.75rem)] font-bold tracking-tight text-slate-900 text-balance">
                Transparent RM packages for every hospital appointment
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Both packages include up to 4 hours of dedicated student companion care across the Klang Valley. Select a package below to pre-fill your booking form.
              </p>
            </div>

            <button
              type="button"
              onClick={onGoToBooking}
              className="inline-flex items-center gap-2 self-start rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 md:self-auto"
            >
              <span>Proceed to Book Now</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Tier 1 and Tier 2 Cards */}
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {PRICING_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`flex flex-col justify-between rounded-xl border p-7 ${
                  pkg.id === 'tier2'
                    ? 'border-emerald-700 bg-emerald-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-sm font-medium tabular-nums text-emerald-700">
                        {pkg.number}
                      </span>
                      <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
                        {pkg.title}
                      </h2>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-2xl font-bold tabular-nums text-slate-900">
                        RM {pkg.price}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                    <span>{pkg.subtitle}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-emerald-700">{pkg.duration}</span>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    {pkg.description}
                  </p>

                  <ul className="mt-5 space-y-2.5 border-t border-slate-200 pt-5">
                    {pkg.includes.map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2.5 text-sm text-slate-700"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                          aria-hidden="true"
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-7 pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectPackage(pkg.id)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                      pkg.id === 'tier2'
                        ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                        : 'border border-slate-300 bg-white text-slate-900 hover:border-emerald-700 hover:text-emerald-800'
                    }`}
                  >
                    Select {pkg.title} (RM {pkg.price})
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Optional Add-ons Strip */}
          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50/70 p-6 md:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Optional Add-ons
              </h3>
              <span className="text-xs text-slate-500">
                Toggle either add-on inside the Book Now form
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {ADDON_ITEMS.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div>
                    <p className="font-display text-sm font-semibold text-slate-900">
                      {addon.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {addon.description}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-semibold tabular-nums text-emerald-700 shrink-0">
                    +RM {addon.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-Step Appointment Workflow */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-emerald-700">
              How Every Escort Works
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              Four structured stages from doorstep pickup to safe return
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Appointment workflow stages"
            className="mt-7 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-1.5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {JOURNEY_PHASES.map((phase) => {
              const isActive = phase.id === activePhase.id;
              return (
                <button
                  key={phase.id}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  onClick={() => setActivePhaseId(phase.id)}
                  className={`rounded-lg px-4 py-2.5 text-left transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${
                    isActive
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`block font-mono text-[11px] tabular-nums ${
                      isActive ? 'text-emerald-100' : 'text-slate-500'
                    }`}
                  >
                    {phase.windowLabel}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium">
                    {phase.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            aria-label={activePhase.label}
            className="mt-5 rounded-xl border border-slate-200 bg-white p-6 md:p-8"
          >
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="font-mono text-xs font-medium text-emerald-700">
                  {activePhase.windowLabel}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-900 text-balance">
                  {activePhase.headline}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {activePhase.summary}
                </p>
                <ul className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                  {activePhase.included.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-xs text-slate-700"
                    >
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="divide-y divide-slate-200 border-t border-slate-200 lg:col-span-7 lg:border-t-0 lg:border-l lg:pl-8">
                {activePhase.steps.map((step, index) => (
                  <div key={step.title} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs font-medium tabular-nums text-emerald-700">
                        0{index + 1}.
                      </span>
                      <h4 className="font-display text-base font-semibold text-slate-900">
                        {step.title}
                      </h4>
                    </div>
                    <p className="mt-1.5 pl-8 text-sm leading-relaxed text-slate-600">
                      {step.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Klang Valley Hospital Zones */}
      <section className="bg-[#0F1F1C] py-16 text-white md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-emerald-300">
              Klang Valley Coverage &amp; Hospitals
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-wide text-white text-balance md:text-3xl">
              Three hospital zones served from our Serdang base
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {KLANG_VALLEY_ZONES.map((zone) => (
              <div
                key={zone.zone}
                className="flex flex-col justify-between rounded-xl border border-white/15 bg-white/5 p-6"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{zone.coverageRadius}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold tracking-wide text-white">
                    {zone.zone}
                  </h3>
                  <ul className="mt-4 space-y-2 border-t border-white/10 pt-4">
                    {zone.hospitals.map((hospital) => (
                      <li
                        key={hospital}
                        className="flex items-start gap-2 text-sm text-white"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"
                          aria-hidden="true"
                        />
                        <span>{hospital}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 font-mono text-xs tabular-nums text-slate-300">
                  <span>{zone.operatingHours}</span>
                  <span>{zone.bookingNotice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
