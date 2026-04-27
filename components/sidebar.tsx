"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Mandanten", href: "/clients" },
  { label: "Aufgaben", href: "/tasks" },
  { label: "Einstellungen", href: "/settings" },
] as const;

type SidebarProps = {
  isCollapsed: boolean;
};

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "h-screen shrink-0 overflow-hidden border-r border-zinc-200 bg-zinc-100 transition-all",
        isCollapsed ? "w-0 border-r-0" : "w-72",
      ].join(" ")}
    >
      {!isCollapsed ? (
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-6">
            <p className="text-lg font-semibold tracking-tight text-zinc-900">VorabTax</p>
            <p className="mt-1 text-sm text-zinc-500">Vorabpauschale</p>
          </div>

          <nav className="flex-1 px-3 py-4">
            <ul className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        "block w-full rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-zinc-900 font-medium text-zinc-50"
                          : "text-zinc-700 hover:bg-zinc-200",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      ) : null}
    </aside>
  );
}
