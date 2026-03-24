"use client";

import { useLayout } from "./LayoutContext";

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useLayout();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: "#FFFFFF",
        minWidth: 0,
        borderRadius: sidebarOpen ? "0 32px 32px 0" : "32px",
        overflow: "hidden",
        transition: "border-radius 0.25s ease",
      }}
    >
      {children}
    </div>
  );
}