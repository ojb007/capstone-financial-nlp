"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ToTopButton from "../components/ToTopButton";

// 필터 체크박스 컴포넌트
function FilterCheckbox({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", userSelect: "none" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setChecked(!checked)}
        style={{ width: "14px", height: "14px", accentColor: "#4A90D9", cursor: "pointer" }}
      />
      <span style={{ fontSize: "13px", color: "#555", fontFamily: "Pretendard, sans-serif" }}>
        {label}
      </span>
    </label>
  );
}

// 임시 테이블 데이터
const ROWS_PER_PAGE = 6;
const ALL_DATA = Array.from({ length: 20 }, (_, i) => ({
  status1: "Data 1",
  status2: "Data 2",
  status3: "Data 3",
  status4: "Data 4",
  status5: "Data 5",
  status6: "Data 6",
}));

export default function AdminPage() {
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_PAGE);
  const [searchText, setSearchText] = useState("");

  const visibleData = ALL_DATA.slice(0, visibleCount);
  const hasMore = visibleCount < ALL_DATA.length;

  return (
    <div style={{ backgroundColor: "#FFFFFF", minHeight: "100%", padding: "24px 40px 60px" }}>

      {/* 페이지 헤더 */}
      <h2 style={{ fontSize: "26px", fontWeight: 600, color: "#000", marginBottom: "20px" }}>
        Admin
      </h2>

      {/* 필터 박스 */}
      <div
        style={{
          border: "1px solid #D9D9D9",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "20px",
        }}
      >
        {/* Filters1 행 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            padding: "12px 20px",
            borderBottom: "1px solid #E8E8E8",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#000", width: "64px", flexShrink: 0 }}>
            Filters1
          </span>
          <FilterCheckbox label="Condition1" />
          <FilterCheckbox label="Condition1" />
          <FilterCheckbox label="Condition1" />
        </div>

        {/* Filters2 행 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            padding: "12px 20px",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#000", width: "64px", flexShrink: 0 }}>
            Filters2
          </span>
          <FilterCheckbox label="Condition1" />
          <FilterCheckbox label="Condition1" />
          <FilterCheckbox label="Condition1" />
          <FilterCheckbox label="Condition1" />

          {/* 오른쪽 정렬 Search */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search..."
              style={{
                border: "1px solid #D9D9D9",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "13px",
                fontFamily: "Pretendard, sans-serif",
                outline: "none",
                width: "140px",
                color: "#333",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#4A90D9")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#D9D9D9")}
            />
            <button
              style={{
                padding: "5px 16px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #D9D9D9",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                color: "#333",
                cursor: "pointer",
                fontFamily: "Pretendard, sans-serif",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F5")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FFFFFF")}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div
        style={{
          border: "1px solid #D9D9D9",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          {/* 헤더 */}
          <thead>
            <tr style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #E8E8E8" }}>
              {["Status 1", "Status 2", "Status 3", "Status 4", "Status 5", "Status 6"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "14px 0",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#000",
                    textAlign: "center",
                    fontFamily: "Pretendard, sans-serif",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {/* 바디 */}
          <tbody>
            {visibleData.map((row, i) => (
              <tr
                key={i}
                style={{ borderBottom: i < visibleData.length - 1 ? "1px solid #F0F0F0" : "none" }}
              >
                {Object.values(row).map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      padding: "12px 0",
                      fontSize: "13px",
                      color: "#444",
                      textAlign: "center",
                      fontFamily: "Pretendard, sans-serif",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Show more 버튼 */}
        {hasMore && (
          <button
            onClick={() => setVisibleCount((v) => v + ROWS_PER_PAGE)}
            style={{
              width: "100%",
              padding: "12px 0",
              backgroundColor: "#FAFAFA",
              border: "none",
              borderTop: "1px solid #E8E8E8",
              fontSize: "13px",
              color: "#555",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              fontFamily: "Pretendard, sans-serif",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F0F0F0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#FAFAFA")}
          >
            <ChevronDown size={14} />
            Show more
          </button>
        )}
      </div>

      <ToTopButton />
    </div>
  );
}