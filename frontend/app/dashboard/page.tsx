import { MoreHorizontal } from "lucide-react";
import ToTopButton from "../components/ToTopButton";

type ChartCardProps = {
  title: string;
  subtitle: string;
};

function ChartCard({ title, subtitle }: ChartCardProps) {
  return (
    <div
      className="rounded-[12px] overflow-hidden"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #D9D9D9",
        width: "310px",
        height: "420px",
        flexShrink: 0,
      }}
    >
      <div className="flex items-start justify-between px-[20px] pt-[20px]">
        <div>
          <p className="text-[24px] font-bold leading-normal whitespace-nowrap">
            {title}
          </p>
          <p
            className="text-[20px] leading-[30px] whitespace-nowrap"
            style={{ color: "#888888" }}
          >
            {subtitle}
          </p>
        </div>
        <MoreHorizontal size={22} className="mt-1 text-[#888]" />
      </div>
      <div
        className="mx-[20px] mt-[10px]"
        style={{ height: "1px", backgroundColor: "#D9D9D9" }}
      />
      <div className="flex items-center justify-center h-[280px]">
        <p className="text-[13px]" style={{ color: "#BBBBBB" }}>
          차트 준비 중
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%" }}>
      <div className="px-[40px] pt-[16px] pb-[60px]">
        <h2
          className="text-[26px] leading-normal mb-[16px]"
          style={{ fontWeight: 600 }}
        >
          Dashboard
        </h2>
        <div className="flex gap-[30px] flex-wrap">
          <ChartCard title="Bar Chart"   subtitle="(Group A-F)"    />
          <ChartCard title="Radar Chart" subtitle="(Group A-F)"    />
          <ChartCard title="Bar Chart"   subtitle="(Group A Only)" />
        </div>
      </div>
      <ToTopButton />
    </div>
  );
}