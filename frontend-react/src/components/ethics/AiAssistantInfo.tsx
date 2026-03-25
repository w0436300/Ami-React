import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

export function AiAssistantInfo({
  explanation,
  shortExplanation,
  label = 'AI-assisted',
  className,
  transparencyHref,
  transparencyLabel = 'View AI Transparency',
  showShortExplanation = true,
}: {
  explanation: ReactNode;
  shortExplanation?: string;
  label?: string;
  className?: string;
  transparencyHref?: string;
  transparencyLabel?: string;
  showShortExplanation?: boolean;
}) {
  const resolvedShortExplanation =
    shortExplanation ??
    (typeof explanation === 'string'
      ? explanation
          .replace(/\s+/g, ' ')
          .split(/(?<=[.!?])\s+/)[0]
          .slice(0, 90)
      : undefined);

  return (
    <details className={cn('group', className)}>
      <summary
        className={cn(
          'list-none cursor-pointer select-none flex items-start gap-2',
          // Hide the built-in marker if the browser supports it
          '[&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-[11px] font-semibold text-[#16324A]">
          <svg className="h-3.5 w-3.5 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V4m0 0h12l-3 4 3 4H5" />
          </svg>
          {label}
        </span>
        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-200 bg-white text-sky-700">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.1 9.1a3 3 0 104.2-4.2A3 3 0 009.1 9.1z" opacity="0" />
            <circle cx="12" cy="12" r="9" opacity="0.25" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18 9 9 0 000-18z" />
          </svg>
        </span>
        {resolvedShortExplanation ? (
          showShortExplanation ? (
            <span className="mt-0.5 text-[11px] font-medium leading-tight text-slate-600">{resolvedShortExplanation}</span>
          ) : null
        ) : null}
      </summary>
      <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
        <div className="leading-relaxed">{explanation}</div>
        {transparencyHref ? (
          <div className="mt-3">
            <Link to={transparencyHref} className="text-sm font-medium text-[#16324A] underline underline-offset-2">
              {transparencyLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </details>
  );
}

