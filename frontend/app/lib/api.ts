const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Result {
  id: number;
  group_name: string;
  dataset: string;
  model: string;
  strategy: string;
  rag_active: boolean;
  accuracy: number | null;
  f1_macro: number | null;
  f1_micro: number | null;
  f1_weighted: number | null;
  exact_match_rate: number | null;
  numeric_close_rate: number | null;
  avg_latency_ms: number | null;
  total_cost_usd: number | null;
  llm_judge_score: number | null;
  total_samples: number | null;
  valid_samples: number | null;
  error_count: number | null;
  created_at: string;
}

export async function fetchResults(dataset?: string): Promise<Result[]> {
  const url = new URL(`${API_BASE}/api/v1/results`);
  if (dataset) url.searchParams.set("dataset", dataset);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch results");
  return res.json();
}

// UI 탭 ID → API dataset 이름
export const DATASET_MAP: Record<string, string> = {
  FPB:       "fpb",
  FiQA:      "fiqa_sa",
  FinQA:     "finqa",
  "MMLU-KO": "financial_mmlu_ko",
};

const GROUPS = ["A", "B", "C", "D", "E", "F"] as const;

// results 배열 → BarChart/RadarChart용 포맷 변환
export function toChartData(results: Result[], datasetId: string) {
  const byGroup: Record<string, Result> = {};
  for (const r of results) byGroup[r.group_name] = r;

  const isQA = DATASET_MAP[datasetId] === "finqa";

  const metrics = isQA
    ? [
        { label: "Exact Match",    key: "exact_match_rate" as keyof Result },
        { label: "Numeric Close",  key: "numeric_close_rate" as keyof Result },
      ]
    : [
        { label: "Accuracy",   key: "accuracy" as keyof Result },
        { label: "F1 Macro",   key: "f1_macro" as keyof Result },
        { label: "F1 Micro",   key: "f1_micro" as keyof Result },
        { label: "F1 Weighted",key: "f1_weighted" as keyof Result },
      ];

  // BarChart: [{ metric, "Group A": 값, "Group B": 값, ... }]
  const barData = metrics.map(({ label, key }) => {
    const row: Record<string, string | number> = { metric: label };
    for (const g of GROUPS) {
      const val = byGroup[g]?.[key] as number | null | undefined;
      row[`Group ${g}`] = val != null ? Math.round(val * 10000) / 100 : 0;
    }
    return row;
  });

  // RadarChart: [{ metric, A: 값, B: 값, ... }]
  const radarData = metrics.map(({ label, key }) => {
    const row: Record<string, string | number> = { metric: label };
    for (const g of GROUPS) {
      const val = byGroup[g]?.[key] as number | null | undefined;
      row[g] = val != null ? Math.round(val * 10000) / 100 : 0;
    }
    return row;
  });

  return { barData, radarData };
}
