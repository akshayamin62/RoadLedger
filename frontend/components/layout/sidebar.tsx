"use client";

import { cn } from "@/lib/utils";
import {
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Truck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/button";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Add Vehicle", icon: Truck },
  { href: "/parties", label: "Add Parties", icon: Users },
  { href: "/transactions", label: "Transactions", icon: ClipboardList },
  { href: "/spare-parts", label: "Spare Parts", icon: Wrench },
  { href: "/history", label: "History", icon: History },
];

export function Sidebar({
  collapsed,
  onToggle,
  onLogout,
  userName,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
  userName?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-5">
        <div className={cn("overflow-hidden", collapsed && "hidden md:hidden")}>
          <p className="text-lg font-semibold tracking-tight">RoadLedger</p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-200">Fleet & Billing</p>
        </div>
        {collapsed ? <p className="hidden w-full text-center text-lg font-bold md:block">RL</p> : null}
        <button className="rounded-md p-1 hover:bg-white/10 md:hidden" onClick={() => setMobileOpen(false)}>
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white text-navy" : "text-blue-100 hover:bg-white/10",
                collapsed && "md:justify-center md:px-2",
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <p className={cn("mb-3 truncate text-xs text-blue-200", collapsed && "md:hidden")}>{userName}</p>
        <Button variant="ghost" className="w-full justify-start text-blue-100 hover:bg-white/10 hover:text-white" onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          <span className={cn(collapsed && "md:hidden")}>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="fixed left-4 top-4 z-40 rounded-lg bg-navy p-2 text-white shadow-lg md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>
      {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-72 md:hidden", mobileOpen ? "block" : "hidden")}>{content}</aside>
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 self-start md:block",
          collapsed ? "w-[84px]" : "w-72",
        )}
      >
        <div className="relative h-full">
          {content}
          <button
            onClick={onToggle}
            className="absolute -right-3 top-7 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-navy shadow md:flex"
            aria-label="Collapse sidebar"
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
      </aside>
    </>
  );
}
