import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeveritySlice, ViolationTypeSlice } from "../../mocks/types/dashboard";

interface SeverityChartProps {
  data: SeveritySlice[];
}

export function SeverityDonutChart({ data }: SeverityChartProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-primary)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface TypesChartProps {
  data: ViolationTypeSlice[];
}

export function TopTypesBarChart({ data }: TypesChartProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
        <XAxis type="number" stroke="#666" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          stroke="#666"
          tick={{ fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            color: "var(--color-text-primary)",
          }}
        />
        <Bar dataKey="count" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
