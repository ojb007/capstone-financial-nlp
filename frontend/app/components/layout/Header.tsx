"use client";

import { Menu, Home, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLayout } from "./LayoutContext";

export default function Header() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useLayout();

  const isHome = pathname === "/";

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header
      style={{
        height: "100px",
        backgroundColor: "#FFFFFF",
        borderBottom: "5px solid #F7F8FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 40px",
        flexShrink: 0,
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* 햄버거 버튼 + 드롭다운 */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen((v) => !v)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", lineHeight: 0, color: "#000" }}
          aria-label="메뉴"
        >
          <Menu size={30} strokeWidth={1.8} />
        </button>

        {/* 드롭다운 메뉴 */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              backgroundColor: "#FFFFFF",
              border: "1px solid #E8E8E8",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              minWidth: "200px",
              overflow: "hidden",
              zIndex: 100,
            }}
          >
            {/* 옵션 1: 홈으로 이동 (세부 페이지에 있을 때만 활성) */}
            <button
              onClick={() => { router.push("/"); setOpen(false); }}
              disabled={isHome}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                background: "none",
                border: "none",
                cursor: isHome ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontFamily: "Pretendard, sans-serif",
                fontWeight: 500,
                color: isHome ? "#BBBBBB" : "#000",
                textAlign: "left",
                borderBottom: "1px solid #F0F0F0",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => { if (!isHome) e.currentTarget.style.backgroundColor = "#F7F8FA"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <Home size={16} style={{ color: isHome ? "#BBBBBB" : "#4A90D9", flexShrink: 0 }} />
              메인 페이지로 이동
            </button>

            {/* 옵션 2: 사이드바 토글 */}
            <button
              onClick={() => { toggleSidebar(); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "Pretendard, sans-serif",
                fontWeight: 500,
                color: "#000",
                textAlign: "left",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#F7F8FA"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              {sidebarOpen
                ? <PanelLeftClose size={16} style={{ color: "#4A90D9", flexShrink: 0 }} />
                : <PanelLeftOpen  size={16} style={{ color: "#4A90D9", flexShrink: 0 }} />
              }
              {sidebarOpen ? "사이드바 숨기기" : "사이드바 보이기"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}