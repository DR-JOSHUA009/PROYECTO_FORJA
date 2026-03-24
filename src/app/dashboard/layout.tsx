"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Gauge, Dumbbell, Apple, Cpu, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { name: "Resumen", href: "/dashboard/home", icon: Gauge },
  { name: "Motor Físico", href: "/dashboard/gym", icon: Dumbbell },
  { name: "Bioquímica", href: "/dashboard/diet", icon: Apple },
  { name: "Agente IA", href: "/dashboard/agent", icon: Cpu },
  { name: "Protocolos", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-white">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 h-screen border-r border-white/5 bg-[#050505] sticky top-0 p-6 relative z-50">
        <div className="mb-12">
          <h1 className="text-2xl font-bold tracking-tighter">FORJA</h1>
          <p className="text-[10px] uppercase tracking-widest text-text-muted font-mono mt-1">
            Sistema Activo
          </p>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-white text-background shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/5 pt-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-xs font-mono text-primary shadow-[0_0_10px_rgba(9,250,211,0.1)]">
              AT
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Atleta Beta</span>
              <span className="text-xs text-text-muted">Nivel Óptimo</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 text-sm text-error/80 hover:text-error hover:bg-error/10 rounded-lg transition-colors mt-2">
            <LogOut className="w-4 h-4" />
            Desconectar
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 pb-24 md:pb-0 overflow-x-hidden">
        {children}
      </main>

      {/* BOTTOM NAV (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full h-20 bg-[#050505]/90 backdrop-blur-xl border-t border-white/5 z-50 flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? "text-white" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
              {/* Active Dot indicator */}
              {isActive && <div className="w-1 h-1 bg-white rounded-full mt-0.5 shadow-[0_0_5px_rgba(255,255,255,0.8)]" />}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
