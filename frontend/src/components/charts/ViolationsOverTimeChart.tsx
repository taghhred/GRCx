import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { violationsData as fallbackTrend } from "./data";
import type { ViolationTrendPoint } from "../../mocks/types/dashboard";

interface ViolationsOverTimeChartProps {
  data?: ViolationTrendPoint[];
}

export default function ViolationsOverTimeChart({
  data = fallbackTrend,
}: ViolationsOverTimeChartProps) {
  const series = data.length > 0 ? data : fallbackTrend;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
        <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 12 }} />
        <YAxis stroke="#666" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-primary)",
          }}
        />
        <Line
          type="monotone"
          dataKey="critical"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="high"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="medium"
          stroke="#eab308"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="low"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
