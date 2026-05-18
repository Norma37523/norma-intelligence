'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

const RANGES = [
  { months: 3,  label: '3M' },
  { months: 6,  label: '6M' },
  { months: 12, label: '12M' },
  { months: 24, label: '24M' },
] as const;

export function PeriodSelector({ activeMonths }: { activeMonths: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setRange(months: number) {
    const next = new URLSearchParams(params);
    next.set('months', String(months));
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-md border bg-card p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.months}
          type="button"
          onClick={() => setRange(r.months)}
          className={cn(
            'rounded px-3 py-1 text-xs font-medium transition-colors',
            activeMonths === r.months
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
