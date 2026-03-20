"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const data = [
  { metric: "Accuracy",    A: 72, B: 60, C: 45, D: 80, E: 55, F: 65 },
  { metric: "F1-Score",    A: 68, B: 75, C: 90, D: 50, E: 70, F: 58 },
  { metric: "Exact Match", A: 55, B: 40, C: 60, D: 72, E: 48, F: 80 },
  { metric: "ROUGE-L",     A: 80, B: 65, C: 55, D: 60, E: 85, F: 45 },
  { metric: "Latency",     A: 60, B: 80, C: 70, D: 45, E: 55, F: 75 },
  { metric: "Cost",        A: 45, B: 55, C: 80, D: 65, E: 60, F: 50 },
];

const groups = [
  { key: "A", name: "Group A", color: "#8979FF" },
  { key: "B", name: "Group B", color: "#FF928A" },
  { key: "C", name: "Group C", color: "#3CC3DF" },
  { key: "D", name: "Group D", color: "#FFAE4C" },
  { key: "E", name: "Group E", color: "#537FF1" },
  { key: "F", name: "Group F", color: "#6FD195" },
];

export default function GroupRadarChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} margin={{ top: 4, right: 20, left: 20, bottom: 0 }}>
        <PolarGrid stroke="rgba(0,0,0,0.1)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fontSize: 10, fill: "rgba(0,0,0,0.7)", fontFamily: "Inter, sans-serif" }}
        />
        <PolarRadiusAxis
          domain={[0, 100]}
          tickCount={4}
          tick={{
            fontSize: 9,
            fill: "rgba(0,0,0,0.45)",
            fontFamily: "Inter, sans-serif",
          }}
          angle={90}
          orientation="left"
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #D9D9D9",
            fontSize: "11px",
            fontFamily: "Pretendard, sans-serif",
          }}
        />
        {groups.map(({ key, name, color }) => (
          <Radar
            key={key}
            name={name}
            dataKey={key}
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            strokeWidth={1.5}
          />
        ))}
        <Legend
          iconType="circle"
          iconSize={7}
          wrapperStyle={{
            fontSize: "10px",
            fontFamily: "Inter, sans-serif",
            color: "rgba(0,0,0,0.7)",
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}