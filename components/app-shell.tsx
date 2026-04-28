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
      <div className="flex shrink-0 bg-zinc-100">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <div className="flex w-5 items-start justify-center border-r border-zinc-200 bg-zinc-100 pt-6">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-label={isSidebarCollapsed ? "Menü einblenden" : "Menü einklappen"}
            className="rounded-md border border-zinc-300 bg-white p-1 text-zinc-600 shadow-sm hover:bg-zinc-100"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
              {isSidebarCollapsed ? (
                <path
                  d="M7 4l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M13 4l-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
