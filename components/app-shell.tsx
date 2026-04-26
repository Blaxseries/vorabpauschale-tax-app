import { ReactNode } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
