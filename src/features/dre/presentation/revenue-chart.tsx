'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Period } from '../domain/period';
import type { SeriesPoint } from '../application/compare-periods';

interface RevenueChartProps {
  revenueGross: ReadonlyArray<SeriesPoint>;
  ebitda: ReadonlyArray<SeriesPoint>;
}

export function RevenueChart({ revenueGross, ebitda }: RevenueChartProps) {
  const data = revenueGross.map((p, i) => ({
    label: Period.fromString(p.period).label(),
    revenue: p.value,
    ebitda: ebitda[i]?.value ?? 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradEbitda" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.15} />
              <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={brShort}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
              name === 'revenue' ? 'Receita bruta' : 'EBITDA',
            ]}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#gradRevenue)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="ebitda"
            name="ebitda"
            stroke="hsl(var(--chart-4))"
            strokeWidth={2}
            fill="url(#gradEbitda)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function brShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}
