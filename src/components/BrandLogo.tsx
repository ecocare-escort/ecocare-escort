import { useState } from 'react';
import { HeartHandshake } from 'lucide-react';

export const BRAND_LOGO_SRC =
  '/assets/aistudio/Gemini_Generated_Image_54vzij54v_bb9866e0.jpg';

interface BrandLogoProps {
  variant?: 'mark' | 'full';
}

export function BrandLogo({ variant = 'mark' }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (variant === 'full') {
    if (hasError) {
      return (
        <span className="font-display text-xl font-bold tracking-tight text-white">
          EcoCare Escorts
        </span>
      );
    }

    return (
      <span className="inline-flex items-center rounded-xl border border-slate-700/60 bg-[#faf9f5] px-3.5 py-2">
        <img
          src={BRAND_LOGO_SRC}
          alt="EcoCare Escorts — Time for you, Care for them."
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="h-14 w-auto object-contain"
        />
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      {hasError ? (
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"
        >
          <HeartHandshake className="h-5 w-5" />
        </span>
      ) : (
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-[#faf9f5]">
          <img
            src={BRAND_LOGO_SRC}
            alt="EcoCare Escorts logo"
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="h-full w-full object-cover translate-y-[24.5%] scale-[2.5] mix-blend-multiply"
          />
        </span>
      )}
      <span className="font-display text-lg font-bold tracking-tight text-slate-900">
        EcoCare Escorts
      </span>
    </span>
  );
}
