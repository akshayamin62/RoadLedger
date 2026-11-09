"use client";

import { useAuth } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, setUser } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* cookie may already be gone */
    }
    setUser(null);
    toast.success("Signed out");
    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} onLogout={logout} userName={user.name} />
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex items-center justify-between pl-12 md:pl-0">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Commercial Vehicle Operations</p>
              <h1 className="text-lg font-semibold text-navy">Jay Roadways & Jay Infra</h1>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{user.email}</div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
