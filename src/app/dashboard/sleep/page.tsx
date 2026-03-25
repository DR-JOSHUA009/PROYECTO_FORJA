"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";
import { Moon, Sunrise, Clock, Zap, Star, TrendingUp, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function SleepModule() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgHours: 0, streak: 0, bestNight: 0 });

  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [saving, setSaving] = useState(false);

  // Feedback IA inmediato
  const [latestFeedback, setLatestFeedback] = useState<string | null>(null);

  const supabase = createClient();
  const OPTIMAL_HOURS = 8;

  const recalcStats = (data: any[]) => {
    if (data && data.length > 0) {
      let total = 0; let streak = 0; let best = 0;
      data.forEach(log => {
        total += Number(log.hours_slept || 0);
        if (log.hours_slept >= 7) streak++;
        if (log.hours_slept > best) best = Number(log.hours_slept);
      });
      setStats({ avgHours: total / data.length, streak, bestNight: best });
    }
  };

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sData } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(14);

      setHistory(sData || []);
      recalcStats(sData || []);

      // Mostrar último feedback si existe
      if (sData && sData.length > 0 && sData[0].ai_feedback) {
        setLatestFeedback(sData[0].ai_feedback);
      }

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const calculateHours = (sleep: string, wake: string) => {
    const s = new Date(`2000-01-01T${sleep}:00`);
    let w = new Date(`2000-01-01T${wake}:00`);
    if (w < s) w = new Date(`2000-01-02T${wake}:00`);
    return (w.getTime() - s.getTime()) / (1000 * 60 * 60);
  };

  const calculatedHours = calculateHours(sleepTime, wakeTime);
  const diffFromOptimal = calculatedHours - OPTIMAL_HOURS;
  const qualityLabel = calculatedHours >= 7.5 ? "Óptimo" : calculatedHours >= 6 ? "Aceptable" : "Insuficiente";
  const qualityColor = calculatedHours >= 7.5 ? "text-emerald-400" : calculatedHours >= 6 ? "text-yellow-400" : "text-red-400";
  const qualityBg = calculatedHours >= 7.5 ? "bg-emerald-500/10 border-emerald-500/20" : calculatedHours >= 6 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setLatestFeedback(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sleep_time: sleepTime,
          wake_time: wakeTime,
          hours_slept: calculatedHours
        })
      });
      const data = await res.json();

      if (data.success) {
        // Mostrar feedback IA inmediato
        if (data.ai_feedback) {
          setLatestFeedback(data.ai_feedback);
        }

        // Refrescar historial
        const { data: sData } = await supabase
          .from("sleep_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(14);
        setHistory(sData || []);
        recalcStats(sData || []);

        toast(`¡Sueño registrado! +${data.xp_earned || 150} XP ⭐`, "success");
      } else {
        toast("Error al guardar: " + data.error, "error");
      }
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const chartData = [...history].reverse().slice(-7);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          Recuperación <Icon3D icon={Moon} color="#60a5fa" size={32} />
        </h1>
        <p className="text-text-secondary">Monitorea la base de tu crecimiento muscular. Meta óptima: <span className="text-white font-bold">{OPTIMAL_HOURS}h</span></p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ===== INPUT DE SUEÑO ===== */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -z-10" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-6">Registro de Hoy</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 bg-background border border-white/5 p-4 rounded-xl">
                  <Moon className="w-5 h-5 text-blue-400" />
                  <div className="flex flex-col flex-1">
                    <span className="text-xs text-text-muted uppercase font-mono tracking-widest">Dormiste a las</span>
                    <input type="time" required value={sleepTime} onChange={(e) => setSleepTime(e.target.value)} className="bg-transparent text-white font-mono text-xl outline-none" />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-background border border-white/5 p-4 rounded-xl">
                  <Sunrise className="w-5 h-5 text-orange-400" />
                  <div className="flex flex-col flex-1">
                    <span className="text-xs text-text-muted uppercase font-mono tracking-widest">Te despertaste</span>
                    <input type="time" required value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="bg-transparent text-white font-mono text-xl outline-none" />
                  </div>
                </div>
              </div>

              {/* LIVE ANALYSIS */}
              <div className={`flex flex-col items-center justify-center p-5 rounded-xl border ${qualityBg}`}>
                <span className="text-4xl font-black text-white">{calculatedHours.toFixed(1)} <span className="text-xl text-text-muted">h</span></span>
                <span className={`text-xs font-mono tracking-widest uppercase mt-1 font-bold ${qualityColor}`}>{qualityLabel}</span>
                <span className="text-[10px] text-text-muted mt-2 font-mono">
                  {diffFromOptimal >= 0 ? `+${diffFromOptimal.toFixed(1)}h sobre la meta` : `${diffFromOptimal.toFixed(1)}h bajo la meta`}
                </span>
              </div>

              <button disabled={saving} type="submit" className="h-12 w-full rounded-xl bg-blue-500 text-white font-bold hover:scale-105 active:scale-95 transition-all outline-none disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizando IA...
                  </>
                ) : "Registrar Sueño"}
              </button>
            </form>
          </div>

          {/* FEEDBACK IA INMEDIATO */}
          <AnimatePresence>
            {latestFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent to-blue-500/5 pointer-events-none" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-400 mb-2 block font-bold">💬 Análisis IA</span>
                <span className="text-sm font-medium text-white/90 leading-relaxed italic">
                  "{latestFeedback}"
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== GRAFICO + STATS ===== */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Promedio", val: `${stats.avgHours.toFixed(1)}h`, icon: Clock, quality: stats.avgHours >= 7 },
              { label: "Mejor Noche", val: `${stats.bestNight.toFixed(1)}h`, icon: Star, quality: true },
              { label: "Racha (≥7h)", val: `${stats.streak} días`, icon: Zap, quality: stats.streak >= 3 },
            ].map((stat, i) => (
              <div key={i} className="glass p-4 rounded-xl border border-white/5 flex gap-3 text-left items-start hover:border-white/15 transition-all">
                <stat.icon className={`w-4 h-4 shrink-0 mt-0.5 ${stat.quality ? "text-emerald-400" : "text-yellow-400"}`} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono line-clamp-1">{stat.label}</span>
                  <div className="text-xl font-bold text-white leading-tight">{stat.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl border border-white/5 p-6 md:p-8 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Últimos 7 Registros</h2>
                <p className="text-text-secondary text-sm">La línea punteada marca tu meta de {OPTIMAL_HOURS}h.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[10px] text-text-muted font-mono">≥7h</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-text-muted font-mono">&lt;7h</span></div>
              </div>
            </div>
            
            {/* GRÁFICO DE BARRAS */}
            <div className="flex-1 flex flex-col justify-end mt-4 mb-8">
              <div className="w-full flex items-end justify-between h-44 gap-2 border-b border-white/10 pb-2 relative">
                {/* Línea objetivo */}
                <div className="absolute w-full border-t border-dashed border-blue-400/30 pointer-events-none" style={{ bottom: `${(OPTIMAL_HOURS / 12) * 100}%` }}>
                  <span className="absolute -left-0 -top-5 text-[10px] text-blue-400/60 font-mono bg-[#050505] pr-2">{OPTIMAL_HOURS}h</span>
                </div>
                
                {chartData.length > 0 ? chartData.map((d, i) => {
                  const h = Number(d.hours_slept || 0);
                  const maxH = 12;
                  const height = `${Math.min((h / maxH) * 100, 100)}%`;
                  const isGood = h >= 7;

                  return (
                    <div key={i} className="flex flex-col items-center flex-1 group">
                      <div className="w-full max-w-[48px] bg-white/[0.02] border border-white/5 rounded-2xl relative h-full flex items-end overflow-hidden hover:border-white/30 transition-all cursor-pointer">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height }}
                          transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                          className={`w-full rounded-t-xl relative ${isGood ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-gradient-to-t from-red-600 to-red-400'} shadow-[0_0_20px_rgba(37,99,235,0.2)]`}
                        >
                          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                        
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-background px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-10 whitespace-nowrap">
                          {h.toFixed(1)} h
                        </div>
                      </div>
                      <span className="text-[9px] text-text-muted mt-3 uppercase font-mono font-bold tracking-tighter">{d.date?.split('-').slice(1).join('/')}</span>
                    </div>
                  );
                }) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-text-muted font-mono text-sm opacity-50">Ingresa datos para construir el gráfico</span>
                  </div>
                )}
              </div>
            </div>

            {/* FEEDBACK IA de último registro (historial) */}
            {history.length > 0 && history[0].ai_feedback && (
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted mb-1 block">Último análisis IA</span>
                <span className="text-sm text-white/80 italic leading-relaxed">
                  "{history[0].ai_feedback}"
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
