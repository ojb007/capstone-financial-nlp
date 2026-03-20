"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const GROUP_COLORS: Record<string, string> = {
  "Group A": "#8979FF",
  "Group B": "#FF928A",
  "Group C": "#3CC3DF",
  "Group D": "#FFAE4C",
  "Group E": "#537FF1",
  "Group F": "#6FD195",
};

const data = [
  { metric: "Accuracy",  "Group A": 55, "Group B": 10, "Group C": 47, "Group D": 10, "Group E": 38, "Group F": 10 },
  { metric: "F1-Score",  "Group A": 49, "Group B": 21, "Group C": 85, "Group D": 35, "Group E": 40, "Group F": 24 },
];

export default function GroupBarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        barCategoryGap="28%"
        barGap={1}
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="rgba(0,0,0,0.08)"
          vertical={false}
        />
        <XAxis
          dataKey="metric"
          tick={{ fontSize: 10, fill: "rgba(0,0,0,0.7)", fontFamily: "Inter, sans-serif" }}
          axisLine={{ stroke: "rgba(0,0,26,0.3)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 20, 40, 60, 80, 100]}
          tick={{ fontSize: 10, fill: "rgba(0,0,0,0.7)", fontFamily: "Inter, sans-serif" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #D9D9D9",
            fontSize: "11px",
            fontFamily: "Pretendard, sans-serif",
          }}
        />
        <Legend
          iconType="square"
          iconSize={8}
          wrapperStyle={{
            fontSize: "10px",
            fontFamily: "Inter, sans-serif",
            color: "rgba(0,0,0,0.7)",
          }}
        />
        {Object.entries(GROUP_COLORS).map(([group, color]) => (
          <Bar
            key={group}
            dataKey={group}
            fill={color}
            fillOpacity={0.8}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}