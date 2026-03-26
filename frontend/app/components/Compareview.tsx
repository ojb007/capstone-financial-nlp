"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const STRATEGIES = [
  { id: "A", label: "Group A", model: "gpt-4o-mini", use_rag: false, desc: "GPT / zero_shot" },
  { id: "B", label: "Group B", model: "gpt-4o-mini", use_rag: false, desc: "GPT / few_shot" },
  { id: "C", label: "Group C", model: "gpt-4o-mini", use_rag: true,  desc: "GPT + RAG / zero_shot" },
  { id: "D", label: "Group D", model: "exaone-4.0",  use_rag: true,  desc: "EXAONE 4.0 + RAG" },
  { id: "E", label: "Group E", model: "gpt-4o-mini", use_rag: true,  desc: "GPT + RAG / optimized" },
  { id: "F", label: "Group F", model: "exaone-deep", use_rag: true,  desc: "EXAONE 미세조정 + RAG" },
];

interface ExperimentResponse {
  experiment_id: number;
  answer: string;
  avg_latency_ms: number;
  total_cost_usd: number;
  is_error: boolean;
  llm_judge_score?: number | null;
  llm_judge_reason?: string | null;
}

interface StrategyResult {
  strategyId: string;
  label: string;
  desc: string;
  status: "loading" | "success" | "error";
  data?: ExperimentResponse;
  error?: string;
}

export default function CompareView({ inputText }: { inputText: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const toggleStrategy = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const handleCompare = async () => {
    if (selected.length < 2 || !inputText.trim()) return;

    setResults(selected.map((id) => {
      const s = STRATEGIES.find((s) => s.id === id)!;
      return { strategyId: id, label: s.label, desc: s.desc, status: "loading" };
    }));
    setIsRunning(true);

    const requests = selected.map(async (id) => {
      const strategy = STRATEGIES.find((s) => s.id === id)!;
      try {
        const res = await fetch(`${API_BASE}/api/v1/experiment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group: id, dataset: "FPB", text: inputText, model: strategy.model, use_rag: strategy.use_rag }),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data: ExperimentResponse = await res.json();
        return { strategyId: id, label: strategy.label, desc: strategy.desc, status: "success" as const, data };
      } catch (err) {
        return { strategyId: id, label: strategy.label, desc: strategy.desc, status: "error" as const, error: err instanceof Error ? err.message : "오류 발생" };
      }
    });

    setResults(await Promise.all(requests));
    setIsRunning(false);
  };

  const colCount = results.length <= 2 ? 2 : 3;

  return (
    <div style={{ marginTop: "32px" }}>
      <p style={{ fontSize: "16px", fontWeight: 600, color: "#000", marginBottom: "12px" }}>전략 비교</p>

      {/* 체크박스 + 버튼 */}
      <div style={{ border: "1px solid #D9D9D9", borderRadius: "10px", padding: "14px 20px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", color: "#555", fontWeight: 500, flexShrink: 0 }}>전략 선택</span>
        {STRATEGIES.map((s) => (
          <label key={s.id} title={s.desc} style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", userSelect: "none", fontSize: "13px", color: selected.includes(s.id) ? "#4A90D9" : "#555", fontWeight: selected.includes(s.id) ? 600 : 400 }}>
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleStrategy(s.id)} style={{ accentColor: "#4A90D9", cursor: "pointer", width: "14px", height: "14px" }} />
            {s.label}
          </label>
        ))}
        <button
          onClick={handleCompare}
          disabled={selected.length < 2 || !inputText.trim() || isRunning}
          style={{
            marginLeft: "auto", padding: "7px 20px",
            backgroundColor: selected.length >= 2 && inputText.trim() && !isRunning ? "#4A90D9" : "#D9D9D9",
            color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600,
            fontFamily: "Pretendard, sans-serif", flexShrink: 0, transition: "background-color 0.15s",
            cursor: selected.length >= 2 && inputText.trim() && !isRunning ? "pointer" : "not-allowed",
          }}
        >
          {isRunning ? "비교 중..." : "비교 분석"}
        </button>
      </div>

      {/* 결과 영역 */}
      {results.length === 0 ? (
        <div style={{ border: "1px dashed #D9D9D9", borderRadius: "10px", height: "140px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "13px", color: "#BBBBBB" }}>
            {selected.length < 2 ? "전략을 2개 이상 선택하세요" : !inputText.trim() ? "위에서 텍스트를 먼저 입력해 주세요" : "비교 분석 버튼을 눌러주세요"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${colCount}, 1fr)`, gap: "14px" }}>
          {results.map((r) => <ResultCard key={r.strategyId} result={r} />)}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: StrategyResult }) {
  const isLoading = result.status === "loading";
  const isError = result.status === "error";
  const score = result.data?.llm_judge_score ?? null;

  return (
    <div style={{ border: `1px solid ${isError ? "#FEB2B2" : "#D9D9D9"}`, borderRadius: "10px", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {/* 헤더 */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${isError ? "#FEB2B2" : "#BDD6EE"}`, backgroundColor: isError ? "#FFF5F5" : "#EAF3FB" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: isError ? "#E53E3E" : "#1A6FAB", margin: 0 }}>{result.label}</p>
        <p style={{ fontSize: "11px", color: "#888", margin: "2px 0 0" }}>{result.desc}</p>
      </div>

      {/* 본문 */}
      <div style={{ padding: "12px 14px", minHeight: "140px", display: "flex", flexDirection: "column", justifyContent: isLoading ? "center" : "flex-start", alignItems: isLoading ? "center" : "flex-start" }}>
        {isLoading ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            {[100, 80, 90, 60].map((w, i) => (
              <div key={i} style={{ height: "12px", width: `${w}%`, borderRadius: "6px", backgroundColor: "#EDF2F7", animation: "skeleton 1.2s ease-in-out infinite" }} />
            ))}
            <style>{`@keyframes skeleton{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          </div>
        ) : isError ? (
          <div>
            <p style={{ fontSize: "12px", color: "#E53E3E", fontWeight: 600, marginBottom: "4px" }}>⚠️ 오류 발생</p>
            <p style={{ fontSize: "12px", color: "#FC8181" }}>{result.error}</p>
          </div>
        ) : result.data ? (
          <div style={{ width: "100%" }}>
            {/* 답변 */}
            <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.7, marginBottom: "10px", wordBreak: "break-word" }}>
              {result.data.answer}
            </p>

            {/* 메타 + LLM Judge */}
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#888" }}>
                <span>⏱ {result.data.avg_latency_ms?.toFixed(0) ?? "-"} ms</span>
                <span>💰 ${result.data.total_cost_usd?.toFixed(6) ?? "-"}</span>
                {result.data.is_error && <span style={{ color: "#E53E3E" }}>⚠️ 에러 감지</span>}
              </div>

              {/* LLM Judge 스코어 */}
              <LlmJudgeBadge score={score} />

              {/* Judge 근거 */}
              {result.data.llm_judge_reason && (
                <p style={{ fontSize: "11px", color: "#666", margin: 0, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>근거: </span>{result.data.llm_judge_reason}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LlmJudgeBadge({ score }: { score: number | null }) {
  const hasScore = score != null;
  const color = !hasScore ? "#BBBBBB" : score >= 7 ? "#2E7D32" : score >= 4 ? "#E65100" : "#C62828";
  const bg    = !hasScore ? "#F5F5F5"  : score >= 7 ? "#E8F5E9"  : score >= 4 ? "#FFF3E0"  : "#FFEBEE";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", backgroundColor: bg, borderRadius: "5px" }}>
      <span style={{ fontSize: "11px" }}>🤖</span>
      <span style={{ fontSize: "11px", fontWeight: 600, color }}>
        LLM Judge: {hasScore ? `${score}/10` : "미구현"}
      </span>
    </div>
  );
}