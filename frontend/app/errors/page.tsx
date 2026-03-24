"use client";

import { MoreHorizontal } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ToTopButton from "../components/ToTopButton";

// 파이 차트 색상 — 보라, 주황, 분홍, 청록
const PIE_COLORS = ["#8979FF", "#FFAE4C", "#FF928A", "#3CC3DF"];

const pieData = [
  { name: "Error 1", value: 35 },
  { name: "Error 2", value: 25 },
  { name: "Error 3", value: 20 },
  { name: "Error 4", value: 20 },
];

const renderLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "4px", justifyContent: "center" }}>
      {payload.map((entry: any, index: number) => (
        <li key={index} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: entry.color, flexShrink: 0 }} />
          <span style={{ fontSize: "11px", color: "rgba(0,0,0,0.7)", fontFamily: "Inter, sans-serif" }}>
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

function PieCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D9D9D9",
        borderRadius: "12px",
        height: "260px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 카드 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 14px 0", flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: "17px", fontWeight: 700, color: "#000", margin: 0, lineHeight: 1.3 }}>
            {title}
          </p>
          <p style={{ fontSize: "13px", color: "#888", margin: "2px 0 0 0" }}>
            {subtitle}
          </p>
        </div>
        <MoreHorizontal size={18} style={{ color: "#aaa", flexShrink: 0, marginTop: 2 }} />
      </div>

      {/* 구분선 */}
      <div style={{ height: "1px", backgroundColor: "#E8E8E8", margin: "10px 0 0", flexShrink: 0 }} />

      {/* 차트 영역 */}
      <div style={{ flex: 1, minHeight: 0, padding: "4px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="40%"
              cy="50%"
              innerRadius={0}
              outerRadius="75%"
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((_, index) => (
                <Cell
                  key={index}
                  fill={PIE_COLORS[index % PIE_COLORS.length]}
                  fillOpacity={0.85}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #D9D9D9",
                fontSize: "11px",
                fontFamily: "Pretendard, sans-serif",
              }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              content={renderLegend}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ErrorsPage() {
  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%", padding: "24px 40px 60px" }}>

      {/* 페이지 헤더 */}
      <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#000", marginBottom: "20px" }}>
        Errors
      </h2>

      {/* 3열 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <PieCard key={i} title="Pie Chart" subtitle="(Group A Only)" />
        ))}
      </div>

      <ToTopButton />
    </div>
  );
}