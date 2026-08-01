"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/feedback";
import { formatNumber } from "@/lib/utils";

export type ChartPoint = { key: string; value: number };

/**
 * Chart palette. Ordered so neighbouring slices stay distinguishable, and
 * every chart is paired with a legend or axis label — colour is never the
 * only way to read a value (spec §29).
 */
const PALETTE = [
  "#c1272d",
  "#1398eb",
  "#c8a24d",
  "#8e1218",
  "#3f8f5b",
  "#8b5cf6",
  "#e5483f",
  "#696158",
];

const AXIS = { fontSize: 11, fill: "#696158" } as const;

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: "rgba(193,39,45,0.06)" }}
      contentStyle={{
        borderRadius: 12,
        border: "1px solid #e7ddd0",
        background: "#ffffff",
        fontSize: 12,
        boxShadow: "0 12px 32px -18px rgba(110,40,20,0.6)",
      }}
      labelStyle={{ fontWeight: 700, color: "#1d1d1d" }}
      formatter={(value) => [formatNumber(Number(value ?? 0)), "Count"]}
    />
  );
}

function NoData({ label }: { label: string }) {
  return (
    <div className="grid h-[var(--chart-h,16rem)] place-items-center">
      <EmptyState title="Nothing to chart yet" body={label} />
    </div>
  );
}

/** Shortens long labels on a vertical axis without hiding meaning. */
function truncate(value: string, max = 18) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function BarChartCard({
  data,
  height = 260,
  layout = "vertical",
  emptyLabel = "Data appears here as leads come in.",
}: {
  data: ChartPoint[];
  height?: number;
  /** `vertical` puts labels down the left — better for long status names. */
  layout?: "vertical" | "horizontal";
  emptyLabel?: string;
}) {
  if (data.length === 0) return <NoData label={emptyLabel} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {layout === "vertical" ? (
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="key"
            width={124}
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: string) => truncate(value)}
          />
          <ChartTooltip />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {data.map((point, index) => (
              <Cell key={point.key} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: -18 }}>
          <XAxis
            dataKey="key"
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            interval={0}
            tickFormatter={(value: string) => truncate(value, 10)}
          />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
          <ChartTooltip />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44}>
            {data.map((point, index) => (
              <Cell key={point.key} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

export function DonutChartCard({
  data,
  height = 260,
  emptyLabel = "Data appears here as the pipeline moves.",
}: {
  data: ChartPoint[];
  height?: number;
  emptyLabel?: string;
}) {
  const total = data.reduce((sum, point) => sum + point.value, 0);
  if (total === 0) return <NoData label={emptyLabel} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          innerRadius="52%"
          outerRadius="80%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((point, index) => (
            <Cell key={point.key} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <ChartTooltip />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => (
            <span style={{ fontSize: 11, color: "#696158" }}>
              {truncate(value, 22)}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TrendChartCard({
  data,
  height = 260,
  emptyLabel = "Twelve months of enquiries will appear here.",
}: {
  data: ChartPoint[];
  height?: number;
  emptyLabel?: string;
}) {
  if (data.length === 0) return <NoData label={emptyLabel} />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -18 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c1272d" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#c1272d" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="key" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
        <ChartTooltip />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#c1272d"
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={{ r: 2.5, fill: "#c1272d", strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
