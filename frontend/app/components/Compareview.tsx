"use client";

import { useState } from "react";

// 전략 A~F 정의
const STRATEGIES = [
  { id: "A", label: "Group A", key: "zero_shot" },
  { id: "B", label: "Group B", key: "optimized_prompt" },
  { id: "C", label: "Group C", key: "rag" },
  { id: "D", label: "Group D", key: "fine_tuned" },
  { id: "E", label: "Group E", key: "rag_prompt" },
  { id: "F", label: "Group F", key: "fine_tuned_rag" },
];

interface StrategyResult {
  strategyId: string;
  label: string;
  status: "loading" | "success" | "error";
  result?: string;
  error?: string;
}

interface CompareViewProps {
  inputText: string;
}

export default function CompareView({ inputText }: CompareViewProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<StrategyResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const toggleStrategy = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selected.length < 2 || !inputText.trim()) return;

    // 선택한 전략들을 로딩 상태로 초기화
    const initial: StrategyResult[] = selected.map((id) => {
      const s = STRATEGIES.find((s) => s.id === id)!;
      return { strategyId: id, label: s.label, status: "loading" };
    });
    setResults(initial);
    setIsRunning(true);

    // Promise.all로 선택한 전략들 동시에 API 호출
    const requests = selected.map(async (id) => {
      const strategy = STRATEGIES.find((s) => s.id === id)!;
      try {
        const res = await fetch("http://localhost:8000/experiment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText, strategy: strategy.key }),
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        const resultText =
          data.result ?? data.answer ?? data.output ?? JSON.stringify(data, null, 2);
        return { strategyId: id, label: strategy.label, status: "success" as const, result: resultText };
      } catch (err) {
        return {
          strategyId: id,
          label: strategy.label,
          status: "error" as const,
          error: err instanceof Error ? err.message : "오류 발생",
        };
      }
    });

    const settled = await Promise.all(requests);
    setResults(settled);
    setIsRunning(false);
  };

  // 결과 열 수 계산 (2~3열)
  const colCount = results.length <= 2 ? 2 : 3;

  return (
    <div style={{ marginTop: "32px" }}>
      {/* 섹션 제목 */}
      <p style={{ fontSize: "16px", fontWeight: 600, color: "#000", marginBottom: "12px" }}>
        전략 비교
      </p>

      {/* 전략 체크박스 */}
      <div
        style={{
          border: "1px solid #D9D9D9",
          borderRadius: "10px",
          padding: "14px 20px",
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "13px", color: "#555", fontWeight: 500, flexShrink: 0 }}>
          전략 선택
        </span>
        {STRATEGIES.map((s) => (
          <label
            key={s.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              cursor: "pointer",
              userSelect: "none",
              fontSize: "13px",
              color: selected.includes(s.id) ? "#4A90D9" : "#555",
              fontWeight: selected.includes(s.id) ? 600 : 400,
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(s.id)}
              onChange={() => toggleStrategy(s.id)}
              style={{ accentColor: "#4A90D9", cursor: "pointer", width: "14px", height: "14px" }}
            />
            {s.label} ({s.id})
          </label>
        ))}

        {/* 비교 버튼 */}
        <button
          onClick={handleCompare}
          disabled={selected.length < 2 || !inputText.trim() || isRunning}
          style={{
            marginLeft: "auto",
            padding: "7px 20px",
            backgroundColor:
              selected.length >= 2 && inputText.trim() && !isRunning ? "#4A90D9" : "#D9D9D9",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            fontFamily: "Pretendard, sans-serif",
            cursor:
              selected.length >= 2 && inputText.trim() && !isRunning ? "pointer" : "not-allowed",
            flexShrink: 0,
            transition: "background-color 0.15s",
          }}
        >
          {isRunning ? "비교 중..." : "비교 분석"}
        </button>
      </div>

      {/* 안내 / 결과 영역 */}
      {results.length === 0 ? (
        /* 빈 상태 */
        <div
          style={{
            border: "1px dashed #D9D9D9",
            borderRadius: "10px",
            height: "160px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p style={{ fontSize: "13px", color: "#BBBBBB" }}>
            {selected.length < 2
              ? "전략을 2개 이상 선택하세요"
              : !inputText.trim()
              ? "위에서 텍스트를 먼저 입력해 주세요"
              : "비교 분석 버튼을 눌러주세요"}
          </p>
        </div>
      ) : (
        /* 결과 그리드 — 2~3열 */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${colCount}, 1fr)`,
            gap: "14px",
          }}
        >
          {results.map((r) => (
            <ResultCard key={r.strategyId} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: StrategyResult }) {
  const isLoading = result.status === "loading";
  const isError = result.status === "error";

  return (
    <div
      style={{
        border: `1px solid ${isError ? "#FEB2B2" : "#D9D9D9"}`,
        borderRadius: "10px",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        transition: "border-color 0.2s",
      }}
    >
      {/* 카드 헤더 */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: `1px solid ${isError ? "#FEB2B2" : "#BDD6EE"}`,
          backgroundColor: isError ? "#FFF5F5" : "#EAF3FB",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: isError ? "#E53E3E" : "#333" }}>
          {result.label}
        </span>
      </div>

      {/* 카드 본문 */}
      <div
        style={{
          padding: "12px 14px",
          minHeight: "120px",
          display: "flex",
          alignItems: isLoading ? "center" : "flex-start",
          justifyContent: isLoading ? "center" : "flex-start",
        }}
      >
        {isLoading ? (
          /* 스켈레톤 UI */
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            {[100, 80, 90, 60].map((w, i) => (
              <div
                key={i}
                style={{
                  height: "12px",
                  width: `${w}%`,
                  borderRadius: "6px",
                  backgroundColor: "#EDF2F7",
                  animation: "skeleton 1.2s ease-in-out infinite",
                }}
              />
            ))}
            <style>{`
              @keyframes skeleton {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.4; }
              }
            `}</style>
          </div>
        ) : isError ? (
          /* 에러 상태 */
          <div>
            <p style={{ fontSize: "12px", color: "#E53E3E", fontWeight: 600, marginBottom: "4px" }}>
              ⚠️ 오류 발생
            </p>
            <p style={{ fontSize: "12px", color: "#FC8181" }}>{result.error}</p>
          </div>
        ) : (
          /* 성공 결과 */
          <p
            style={{
              fontSize: "13px",
              color: "#333",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
            }}
          >
            {result.result}
          </p>
        )}
      </div>
    </div>
  );
}