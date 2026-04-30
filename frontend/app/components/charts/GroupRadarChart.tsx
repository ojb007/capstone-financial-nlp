"use client";

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip,
} from "recharts";

const GROUPS = [
  { key: "A", name: "Group A", color: "#8979FF" },
  { key: "B", name: "Group B", color: "#FF928A" },
  { key: "C", name: "Group C", color: "#3CC3DF" },
  { key: "D", name: "Group D", color: "#FFAE4C" },
  { key: "E", name: "Group E", color: "#537FF1" },
  { key: "F", name: "Group F", color: "#6FD195" },
];

interface Props {
  data: Record<string, string | number>[];
}

export default function GroupRadarChart({ data }: Props) {
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
          tick={{ fontSize: 9, fill: "rgba(0,0,0,0.45)", fontFamily: "Inter, sans-serif" }}
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
        {GROUPS.map(({ key, name, color }) => (
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
          wrapperStyle={{ fontSize: "10px", fontFamily: "Inter, sans-serif", color: "rgba(0,0,0,0.7)" }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
