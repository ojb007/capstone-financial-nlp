"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle,
  PlayCircle,
  ShoppingCart,
  AlertCircle,
  Settings,
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: CheckCircle },
  { id: "demo",      label: "Demo",       icon: PlayCircle  },
  { id: "cost",      label: "Cost",       icon: ShoppingCart },
  { id: "errors",    label: "Errors",     icon: AlertCircle },
  { id: "admin",     label: "Admin",      icon: Settings    },
];

export default function Sidebar() {
  const [activeId, setActiveId] = useState<string>("dashboard");

  useEffect(() => {
    const scrollContainer = document.querySelector("main") as HTMLElement | null;
    if (!scrollContainer) return;

    const observers: IntersectionObserver[] = [];

    navItems.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        {
          root: scrollContainer,
          rootMargin: "-20% 0px -60% 0px",
          threshold: 0,
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    e.preventDefault();
    const scrollContainer = document.querySelector("main");
    const target = document.getElementById(id);
    if (!scrollContainer || !target) return;

    // main 컨테이너 기준으로 스크롤 위치 계산
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const offset = targetTop - containerTop + scrollContainer.scrollTop;

    scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
    setActiveId(id);
  };

  return (
    <aside
      className="w-[260px] shrink-0"
      style={{
        backgroundColor: "#F5F8FE",
        borderRadius: "32px 0 0 32px",
      }}
    >
      {/* 타이틀 */}
      <div className="pl-[47px] pt-[36px] mb-[42px]">
        <h1
          className="text-[32px] font-bold leading-normal whitespace-nowrap"
          style={{ color: "#000000" }}
        >
          Home
        </h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col px-[20px]" style={{ gap: "8px" }}>
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeId === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => handleClick(e, id)}
              className="flex items-center gap-[11px] px-[20px] py-[10px] rounded-[12px] w-[219px] transition-colors duration-150"
              style={{
                backgroundColor: isActive ? "#4A90D9" : "#F5F8FE",
                color: isActive ? "#FFFFFF" : "#000000",
                textDecoration: "none",
              }}
            >
              <Icon
                size={28}
                strokeWidth={1.8}
                style={{ flexShrink: 0, color: isActive ? "#FFFFFF" : "#000000" }}
              />
              <span
                className="text-[24px] leading-normal whitespace-nowrap"
                style={{ fontWeight: isActive ? 700 : 600 }}
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