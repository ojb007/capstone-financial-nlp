"use client";

import { useLayout } from "./LayoutContext";

export default function SidebarWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useLayout();

  return (
    <div
      style={{
        width: sidebarOpen ? "260px" : "0px",
        flexShrink: 0,
        overflow: "hidden",
        transition: "width 0.25s ease",
        borderRadius: "32px 0 0 32px",
      }}
    >
      {children}
    </div>
  );
}