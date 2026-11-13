import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  fallbackSubtitle,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-800 p-6 text-center text-white ${className}`}
      >
        <ShieldCheck className="mb-3 h-8 w-8 text-emerald-400" aria-hidden="true" />
        <p className="font-display text-sm font-semibold tracking-tight text-white">
          {fallbackTitle}
        </p>
        {fallbackSubtitle && (
          <p className="mt-1 max-w-xs text-xs text-slate-300">{fallbackSubtitle}</p>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
