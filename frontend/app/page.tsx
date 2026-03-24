import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import ToTopButton from "./components/ToTopButton";
import GroupBarChart from "./components/charts/GroupBarChart";
import GroupRadarChart from "./components/charts/GroupRadarChart";

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
      className="rounded-[12px] overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D9D9D9",
        height: "420px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 카드 헤더 */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "16px 16px 0 16px",
          flexShrink: 0,
        }}
      >
        <div>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "#000", lineHeight: 1.3, margin: 0 }}>
            {title}
          </p>
          <p style={{ fontSize: "14px", color: "#888", margin: "2px 0 0 0" }}>
            {subtitle}
          </p>
        </div>
        <MoreHorizontal size={20} style={{ color: "#aaa", flexShrink: 0, marginTop: 2 }} />
      </div>

      <div style={{ margin: "10px 16px 0", height: "1px", backgroundColor: "#E8E8E8", flexShrink: 0 }} />

      <div style={{ flex: 1, minHeight: 0, padding: "8px 4px 4px" }}>
        {children ?? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p style={{ fontSize: "12px", color: "#BBBBBB" }}>차트 준비 중</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, seeAllHref }: { title: string; seeAllHref: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
      <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#000", margin: 0 }}>
        {title}
      </h2>
      <Link href={seeAllHref} style={{ fontSize: "20px", color: "#4A90D9", textDecoration: "none" }}>
        See All
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%" }}>
      <div style={{ padding: "16px 40px 0" }}>

        {/* ── Dashboard 섹션 ── */}
        <section id="dashboard" style={{ marginBottom: "30px", scrollMarginTop: "20px" }}>
          <SectionHeader title="Dashboard" seeAllHref="/dashboard" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            <ChartCard title="Bar Chart" subtitle="(Group A-F)">
              <GroupBarChart />
            </ChartCard>
            <ChartCard title="Radar Chart" subtitle="(Group A-F)">
              <GroupRadarChart />
            </ChartCard>
            <ChartCard title="Bar Chart" subtitle="(Group A Only)" />
            <ChartCard title="Line Chart" subtitle="(Group A-F)" />
          </div>
        </section>

        {/* ── Demo 섹션 ── */}
        <section id="demo" style={{ marginBottom: "30px", scrollMarginTop: "20px" }}>
          <SectionHeader title="Demo" seeAllHref="/demo" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ border: "1px solid #D9D9D9", borderRadius: "12px", height: "420px" }} />
            ))}
          </div>
        </section>

        {/* ── Cost 섹션 ── */}
        <section id="cost" style={{ marginBottom: "30px", scrollMarginTop: "20px" }}>
          <SectionHeader title="Cost" seeAllHref="/cost" />
          <div style={{ border: "1px solid #D9D9D9", borderRadius: "12px", height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "13px", color: "#BBBBBB" }}>준비 중</p>
          </div>
        </section>

        {/* ── Errors 섹션 ── */}
        <section id="errors" style={{ marginBottom: "30px", scrollMarginTop: "20px" }}>
          <SectionHeader title="Errors" seeAllHref="/errors" />
          <div style={{ border: "1px solid #D9D9D9", borderRadius: "12px", height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "13px", color: "#BBBBBB" }}>준비 중</p>
          </div>
        </section>

        {/* ── Admin 섹션 ── */}
        <section id="admin" style={{ scrollMarginTop: "20px", paddingBottom: "50vh" }}>
          <SectionHeader title="Admin" seeAllHref="/admin" />
          <div style={{ border: "1px solid #D9D9D9", borderRadius: "12px", height: "300px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "13px", color: "#BBBBBB" }}>준비 중</p>
          </div>
        </section>

      </div>
      <ToTopButton />
    </div>
  );
}