import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";

export const metadata: Metadata = {
  title: "Capstone Board",
  description: "AI Model Evaluation Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">

      <body style={{ backgroundColor: "#FFFFFF", margin: 0, padding: 0 }}>
        <div
          style={{
            backgroundColor: "#E6EBF7",
            padding: "39px",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "calc(100vh - 78px)",
              borderRadius: "32px",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
            }}
          >
            {/* 사이드바 */}
            <Sidebar />

            {/* 오른쪽 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: "#FFFFFF",
                minWidth: 0,
              }}
            >
              <Header />

              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <main
                  style={{
                    position: "absolute",
                    inset: 0,
                    overflowY: "auto",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  {children}
                </main>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}