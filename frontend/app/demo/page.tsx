"use client";

import { useState } from "react";
import CompareView from "../components/Compareview";

interface ExperimentResult {
  result?: string;
  answer?: string;
  output?: string;
  [key: string]: unknown;
}

export default function DemoPage() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, strategy: "zero_shot" }),
      });

      if (!res.ok) throw new Error(`서버 오류: ${res.status} ${res.statusText}`);

      const data: ExperimentResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const resultText = result
    ? (result.result ?? result.answer ?? result.output ?? JSON.stringify(result, null, 2))
    : null;

  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%", padding: "24px 40px 60px" }}>

      {/* 페이지 타이틀 */}
      <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#000", marginBottom: "20px" }}>
        Demo
      </h2>

      {/* ── 단일 분석 영역 ── */}
      {/* Result 박스 */}
      <div
        style={{
          border: "1px solid #D9D9D9",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "14px 20px 0" }}>
          <p style={{ fontSize: "16px", fontWeight: 500, color: "#000", margin: 0 }}>Result</p>
        </div>
        <div style={{ height: "1px", backgroundColor: "#D9D9D9", margin: "12px 0 0" }} />
        <div
          style={{
            height: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px 20px",
            overflowY: "auto",
          }}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : error ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#E53E3E", marginBottom: "8px" }}>⚠️ {error}</p>
              <p style={{ fontSize: "12px", color: "#BBBBBB" }}>
                API 서버가 실행 중인지 확인해 주세요 (localhost:8000)
              </p>
            </div>
          ) : resultText ? (
            <div
              style={{
                width: "100%",
                backgroundColor: "#F8FAFF",
                border: "1px solid #E0E8FF",
                borderRadius: "8px",
                padding: "16px",
                fontSize: "14px",
                color: "#333",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                overflowY: "auto",
                maxHeight: "160px",
              }}
            >
              {resultText}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "#BBBBBB" }}>
              텍스트를 입력하고 분석 버튼을 눌러주세요
            </p>
          )}
        </div>
      </div>

      {/* 입력 영역 */}
      <div>
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "8px" }}>Demo</p>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Input text..."
          style={{
            width: "100%",
            height: "80px",
            border: "1px solid #D9D9D9",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "14px",
            color: "#333",
            fontFamily: "Pretendard, sans-serif",
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#4A90D9")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#D9D9D9")}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <button
            onClick={handleSubmit}
            disabled={!inputText.trim() || isLoading}
            style={{
              padding: "8px 28px",
              backgroundColor: inputText.trim() && !isLoading ? "#4A90D9" : "#D9D9D9",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "Pretendard, sans-serif",
              fontWeight: 600,
              cursor: inputText.trim() && !isLoading ? "pointer" : "not-allowed",
              transition: "background-color 0.15s",
            }}
          >
            {isLoading ? "분석 중..." : "분석"}
          </button>
        </div>
      </div>

      {/* ── 전략 비교 영역 (CompareView) ── */}
      <CompareView inputText={inputText} />

    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#AAAAAA"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{ animation: "spin 1s linear infinite" }}
    >
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      <line x1="12" y1="2"  x2="12" y2="6"  />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93"  y1="4.93"  x2="7.76"  y2="7.76"  />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2"  y1="12" x2="6"  y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93"  y1="19.07" x2="7.76"  y2="16.24" />
      <line x1="16.24" y1="7.76"  x2="19.07" y2="4.93"  />
    </svg>
  );
}