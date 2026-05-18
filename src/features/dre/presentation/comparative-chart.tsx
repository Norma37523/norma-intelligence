'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Period } from '../domain/period';
import type { SeriesPoint } from '../application/compare-periods';

interface ComparativeChartProps {
  revenueGross: ReadonlyArray<SeriesPoint>;
  ebitda: ReadonlyArray<SeriesPoint>;
  netProfit: ReadonlyArray<SeriesPoint>;
}

/**
 * Multi-line monthly comparative — Revenue (Gross), EBITDA, Net Profit.
 * Uses recharts; reads CSS variables for theme colors.
 */
export function ComparativeChart({ revenueGross, ebitda, netProfit }: ComparativeChartProps) {
  const data = revenueGross.map((p, i) => ({
    label: Period.fromString(p.period).label(),
    revenue: p.value,
    ebitda: ebitda[i]?.value ?? 0,
    net: netProfit[i]?.value ?? 0,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => brShort(v)}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
            }
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Receita bruta"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ebitda"
            name="EBITDA"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="net"
            name="Resultado líquido"
            stroke="hsl(var(--chart-4))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function brShort(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}
