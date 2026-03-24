"use client";

import { createContext, useContext, useState } from "react";

type LayoutContextType = {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
};

const LayoutContext = createContext<LayoutContextType>({
  sidebarOpen: true,
  toggleSidebar: () => {},
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = () => setSidebarOpen((v) => !v);

  return (
    <LayoutContext.Provider value={{ sidebarOpen, toggleSidebar }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}