"use client";

import { MoreHorizontal, SlidersHorizontal } from "lucide-react";
import ToTopButton from "../components/ToTopButton";
import GroupBarChart from "../components/charts/GroupBarChart";

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D9D9D9",
        borderRadius: "12px",
        height: "280px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 카드 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "14px 14px 0",
          flexShrink: 0,
        }}
      >
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
      <div style={{ height: "1px", backgroundColor: "#E8E8E8", margin: "10px 0 0" , flexShrink: 0 }} />

      {/* 차트 영역 */}
      <div style={{ flex: 1, minHeight: 0, padding: "4px 4px 4px" }}>
        {children ?? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p style={{ fontSize: "12px", color: "#BBBBBB" }}>차트 준비 중</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 스캐터 차트 플레이스홀더
function ScatterPlaceholder() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: "6px" }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* 간단한 스캐터 점 표현 */}
        {[
          [10, 35], [16, 20], [22, 30], [28, 15], [34, 25], [40, 10],
          [14, 38], [24, 22], [32, 32], [38, 18],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#8979FF" fillOpacity="0.7" />
        ))}
        {/* X축 */}
        <line x1="6" y1="42" x2="44" y2="42" stroke="rgba(0,0,26,0.2)" strokeWidth="1" />
        {/* Y축 */}
        <line x1="6" y1="6" x2="6" y2="42" stroke="rgba(0,0,26,0.2)" strokeWidth="1" />
      </svg>
      <p style={{ fontSize: "11px", color: "#BBBBBB" }}>Scatter 준비 중</p>
    </div>
  );
}

export default function CostPage() {
  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%", padding: "24px 40px 60px" }}>

      {/* 페이지 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#000", margin: 0 }}>
          Cost
        </h2>
        {/* Filters 버튼 */}
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: "#888",
            padding: "4px 8px",
            borderRadius: "6px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F5")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <span>Filters...</span>
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* 카드 그리드 — 3열 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        {/* Row 1 — Bar Charts */}
        <ChartCard title="Bar Chart" subtitle="(Group A Only)">
          <GroupBarChart />
        </ChartCard>
        <ChartCard title="Bar Chart" subtitle="(Group A Only)">
          <GroupBarChart />
        </ChartCard>
        <ChartCard title="Bar Chart" subtitle="(Group A Only)">
          <GroupBarChart />
        </ChartCard>

        {/* Row 2 — Scatter Charts */}
        <ChartCard title="Scatter" subtitle="(Group A Only)">
          <ScatterPlaceholder />
        </ChartCard>
        <ChartCard title="Scatter" subtitle="(Group A Only)">
          <ScatterPlaceholder />
        </ChartCard>
        <ChartCard title="Scatter" subtitle="(Group A Only)">
          <ScatterPlaceholder />
        </ChartCard>
      </div>

      <ToTopButton />
    </div>
  );
}