"use client";

import { Menu } from "lucide-react";

export default function Header() {
  return (
    <header
      className="shrink-0 flex items-center justify-end px-[40px]"
      style={{
        height: "100px",
        backgroundColor: "#FFFFFF",
        borderBottom: "5px solid #F7F8FA",
      }}
    >
      <button
        className="flex items-center justify-center"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "#000000",
          lineHeight: 0,
        }}
        aria-label="메뉴 열기"
      >
        <Menu size={30} strokeWidth={1.8} />
      </button>
    </header>
  );
}