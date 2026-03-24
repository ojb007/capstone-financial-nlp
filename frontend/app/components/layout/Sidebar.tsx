"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CheckCircle,
  PlayCircle,
  ShoppingCart,
  AlertCircle,
  Settings,
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: CheckCircle, path: "/dashboard" },
  { id: "demo",      label: "Demo",       icon: PlayCircle,  path: "/demo"      },
  { id: "cost",      label: "Cost",       icon: ShoppingCart,path: "/cost"      },
  { id: "errors",    label: "Errors",     icon: AlertCircle, path: "/errors"    },
  { id: "admin",     label: "Admin",      icon: Settings,    path: "/admin"     },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [scrollActiveId, setScrollActiveId] = useState<string>("dashboard");

  // 세부 페이지 여부 판단
  const isDetailPage = pathname !== "/";

  // 세부 페이지에서 현재 경로에 맞는 메뉴 ID
  const pathActiveId = navItems.find((item) => pathname.startsWith(item.path))?.id ?? "";

  // 실제 활성 ID: 세부 페이지면 경로 기준, 홈이면 스크롤 기준
  const activeId = isDetailPage ? pathActiveId : scrollActiveId;

  useEffect(() => {
    // 세부 페이지에선 스크롤 감지 불필요
    if (isDetailPage) return;

    // main 컨테이너가 렌더링된 뒤에 찾아야 하므로 약간 지연
    const init = () => {
      const scrollContainer = document.querySelector("main") as HTMLElement | null;
      if (!scrollContainer) return;

      const observers: IntersectionObserver[] = [];

      navItems.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (!el) return;

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setScrollActiveId(id);
          },
          {
            root: scrollContainer,
            rootMargin: "-10% 0px -40% 0px",
            threshold: 0,
          }
        );

        observer.observe(el);
        observers.push(observer);
      });

      return () => observers.forEach((o) => o.disconnect());
    };

    // DOM 준비 후 실행
    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, [isDetailPage, pathname]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    // 세부 페이지에서 클릭 시 해당 페이지로 이동
    if (isDetailPage) {
      const item = navItems.find((item) => item.id === id);
      if (item) window.location.href = item.path;
      return;
    }

    const scrollContainer = document.querySelector("main");
    const target = document.getElementById(id);
    if (!scrollContainer || !target) return;

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const offset = targetTop - containerTop + scrollContainer.scrollTop;

    scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
    setScrollActiveId(id);
  };

  return (
    <aside
      style={{
        width: "260px",
        height: "100%",
        backgroundColor: "#F5F8FE",
        flexShrink: 0,
        boxSizing: "border-box",
      }}
    >
      {/* 타이틀 */}
      <div style={{ paddingLeft: "47px", paddingTop: "36px", marginBottom: "42px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, color: "#000000", margin: 0 }}>
          Home
        </h1>
      </div>

      {/* 네비게이션 */}
      <nav style={{ display: "flex", flexDirection: "column", padding: "0 20px", gap: "8px" }}>
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id;
          return (
            <a
              key={id}
              href={isDetailPage ? navItems.find((item) => item.id === id)?.path ?? '/' : `#${id}`}
              onClick={(e) => handleClick(e, id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                padding: "10px 20px",
                borderRadius: "12px",
                width: "219px",
                textDecoration: "none",
                backgroundColor: isActive ? "#4A90D9" : "#F5F8FE",
                color: isActive ? "#FFFFFF" : "#000000",
                transition: "background-color 0.15s",
              }}
            >
              <Icon
                size={28}
                strokeWidth={1.8}
                style={{ flexShrink: 0, color: isActive ? "#FFFFFF" : "#000000" }}
              />
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: isActive ? 700 : 600,
                  lineHeight: "normal",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}