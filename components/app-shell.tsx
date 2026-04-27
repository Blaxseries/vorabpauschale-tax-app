"use client";

import { ReactNode, useState } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <div className="relative shrink-0 overflow-visible">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <button
          type="button"
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          aria-label={isSidebarCollapsed ? "Menü einblenden" : "Menü einklappen"}
          className="absolute right-0 top-6 z-20 translate-x-1/2 rounded-full border border-zinc-300 bg-white p-1 text-zinc-600 shadow-sm hover:bg-zinc-100"
        >
          <span className="block h-5 w-5 text-center text-sm leading-5">
            {isSidebarCollapsed ? "›" : "‹"}
          </span>
        </button>
      </div>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
