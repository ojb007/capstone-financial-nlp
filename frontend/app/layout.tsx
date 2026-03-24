import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import { LayoutProvider } from "./components/layout/LayoutContext";
import SidebarWrapper from "./components/layout/SidebarWrapper";
import MainContainer from "./components/layout/Maincontainer";

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
        <LayoutProvider>
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
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                borderRadius: "32px",
              }}
            >
              <SidebarWrapper>
                <Sidebar />
              </SidebarWrapper>

              <MainContainer>
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
              </MainContainer>
            </div>
          </div>
        </LayoutProvider>
      </body>
    </html>
  );
}