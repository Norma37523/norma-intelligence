'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PLACEHOLDER = MONTHS.map((m, i) => ({
  label: m,
  historical: i < 6 ? 200_000 + Math.sin(i * 0.8) * 40_000 + i * 8_000 : null,
  p50: i >= 5 ? 250_000 + Math.sin(i * 0.6) * 30_000 + (i - 5) * 12_000 : null,
  p10: i >= 5 ? 210_000 + Math.sin(i * 0.6) * 20_000 + (i - 5) * 8_000 : null,
  p90: i >= 5 ? 290_000 + Math.sin(i * 0.6) * 40_000 + (i - 5) * 16_000 : null,
}));

export function ForecastSkeleton() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <div className="rounded-lg border bg-background/90 px-6 py-3 shadow-sm backdrop-blur-sm">
          <p className="text-sm font-medium text-muted-foreground">
            Conecte dados históricos para ativar o forecast
          </p>
        </div>
      </div>
      <div className="h-72 w-full opacity-30">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={PLACEHOLDER} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
            />
            <Area
              type="monotone"
              dataKey="historical"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#gradHist)"
              dot={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="p50"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#gradForecast)"
              dot={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
