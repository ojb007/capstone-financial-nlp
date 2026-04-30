"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import ToTopButton from "../components/ToTopButton";
import GroupBarChart from "../components/charts/GroupBarChart";
import GroupRadarChart from "../components/charts/GroupRadarChart";
import { fetchResults, toChartData, DATASET_MAP } from "../lib/api";

const DATASETS = [
  { id: "FPB",     label: "FPB",     desc: "금융 감성 분류" },
  { id: "FiQA",    label: "FiQA",    desc: "금융 Q&A" },
  { id: "FinQA",   label: "FinQA",   desc: "재무제표 계산" },
  { id: "MMLU-KO", label: "MMLU-KO", desc: "한국어 금융" },
];

function DatasetTabs({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div style={{
      display: "flex", gap: "0", marginBottom: "20px",
      border: "1px solid #D9D9D9", borderRadius: "10px",
      overflow: "hidden", width: "fit-content",
    }}>
      {DATASETS.map((ds, i) => {
        const isActive = active === ds.id;
        return (
          <button
            key={ds.id}
            onClick={() => onChange(ds.id)}
            title={ds.desc}
            style={{
              padding: "8px 20px", fontSize: "13px",
              fontWeight: isActive ? 700 : 500,
              fontFamily: "Pretendard, sans-serif",
              color: isActive ? "#FFFFFF" : "#555",
              backgroundColor: isActive ? "#4A90D9" : "#FFFFFF",
              border: "none",
              borderRight: i < DATASETS.length - 1 ? "1px solid #D9D9D9" : "none",
              cursor: "pointer",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            {ds.label}
          </button>
        );
      })}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "#FFFFFF", border: "1px solid #D9D9D9",
      borderRadius: "12px", height: "420px",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 0", flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: "20px", fontWeight: 700, color: "#000", margin: 0, lineHeight: 1.3 }}>{title}</p>
          <p style={{ fontSize: "14px", color: "#888", margin: "2px 0 0" }}>{subtitle}</p>
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

export default function DashboardPage() {
  const [activeDataset, setActiveDataset] = useState("FPB");
  const [barData, setBarData]   = useState<Record<string, string | number>[]>([]);
  const [radarData, setRadarData] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchResults(DATASET_MAP[activeDataset])
      .then((results) => {
        const { barData, radarData } = toChartData(results, activeDataset);
        setBarData(barData);
        setRadarData(radarData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeDataset]);

  const isMmluKo = activeDataset === "MMLU-KO";

  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%", padding: "24px 40px 60px" }}>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#000", margin: 0 }}>Dashboard</h2>
        <Link href="/" style={{ fontSize: "16px", color: "#4A90D9", textDecoration: "none" }}>
          ← 홈으로
        </Link>
      </div>

      <DatasetTabs active={activeDataset} onChange={setActiveDataset} />

      {isMmluKo && (
        <div style={{
          backgroundColor: "#FFF8E1", border: "1px solid #FFE082",
          borderRadius: "8px", padding: "10px 16px", marginBottom: "16px",
          fontSize: "13px", color: "#E65100",
        }}>
          MMLU-KO 데이터셋은 준비 중입니다. 데이터 수집 이후 결과가 표시됩니다.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
        <ChartCard title="Bar Chart" subtitle={`(Group A-F · ${activeDataset})`}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ fontSize: "12px", color: "#BBBBBB" }}>불러오는 중...</p>
            </div>
          ) : barData.length > 0 ? (
            <GroupBarChart data={barData} />
          ) : null}
        </ChartCard>

        <ChartCard title="Radar Chart" subtitle={`(Group A-F · ${activeDataset})`}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ fontSize: "12px", color: "#BBBBBB" }}>불러오는 중...</p>
            </div>
          ) : radarData.length > 0 ? (
            <GroupRadarChart data={radarData} />
          ) : null}
        </ChartCard>

        <ChartCard title="Bar Chart" subtitle={`(Group A Only · ${activeDataset})`} />
        <ChartCard title="Line Chart" subtitle={`(Group A-F · ${activeDataset})`} />
      </div>

      <ToTopButton />
    </div>
  );
}
