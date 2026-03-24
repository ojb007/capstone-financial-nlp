"use client";

import { useEffect, useState } from "react";

export default function ToTopButton() {
  // main 컨테이너의 위치를 기준으로 버튼 위치 계산
  const [pos, setPos] = useState({ bottom: 40, right: 40 });

  useEffect(() => {
    const updatePos = () => {
      const main = document.querySelector("main");
      if (!main) return;
      const rect = main.getBoundingClientRect();
      // main 오른쪽 하단 기준으로 안쪽에 위치
      setPos({
        bottom: window.innerHeight - rect.bottom + 40,
        right: window.innerWidth - rect.right + 40,
      });
    };

    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, []);

  const handleClick = () => {
    const main = document.querySelector("main");
    if (main) {
      main.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="맨 위로"
      style={{
        position: "fixed",
        bottom: `${pos.bottom}px`,
        right: `${pos.right}px`,
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        backgroundColor: "#DCDCDC",
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
        transition: "opacity 0.15s",
        zIndex: 50,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
      <span
        style={{
          fontFamily: "Pretendard, sans-serif",
          fontWeight: 700,
          fontSize: "13px",
          color: "#000000",
          lineHeight: 1,
        }}
      >
        TOP
      </span>
    </button>
  );
}