"use client";

import { motion } from "framer-motion";
import { Moon, Sunrise, Clock, Zap, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SleepModule() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ avgHours: 0, streak: 0, bestNight: 0 });

  const [sleepTime, setSleepTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sData } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(7);

      setHistory(sData || []);

      if (sData && sData.length > 0) {
        let total = 0; let streak = 0; let best = 0;
        sData.forEach(log => {
          total += Number(log.hours_slept || 0);
          if (log.hours_slept >= 7) streak++;
          if (log.hours_slept > best) best = Number(log.hours_slept);
        });
        setStats({ avgHours: total / sData.length, streak, bestNight: best });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const calculatedHours = calculateHours(sleepTime, wakeTime);

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
        const { data: sData } = await supabase
          .from("sleep_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(7);
        setHistory(sData || []);

        if (sData && sData.length > 0) {
          let total = 0; let streak = 0; let best = 0;
          sData.forEach(log => {
            total += Number(log.hours_slept || 0);
            if (log.hours_slept >= 7) streak++;
            if (log.hours_slept > best) best = Number(log.hours_slept);
          });
          setStats({ avgHours: total / (sData.length || 1), streak, bestNight: best });
        }
        alert("¡Registro de sueño guardado! +150 XP");
      } else {
        alert("Error al guardar: " + data.error);
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

  // Prepara los datos del gráfico: revertimos el historial para que vaya cronológico
  const chartData = [...history].reverse();

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          Recuperación <Moon className="text-blue-400 w-6 h-6" />
        </h1>
        <p className="text-text-secondary">Monitorea la base de tu crecimiento muscular.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* INPUT DE SUEÑO */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] -z-10" />
            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-xs font-mono">Registro de Hoy</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

              <div className="flex flex-col items-center justify-center p-4">
                <span className="text-4xl font-bold text-white">{calculateHours(sleepTime, wakeTime).toFixed(1)} <span className="text-xl text-text-muted">h</span></span>
                <span className="text-xs text-blue-400 font-mono tracking-widest uppercase mt-2">Horas calculadas</span>
              </div>

              <button disabled={saving} type="submit" className="h-12 w-full mt-2 rounded-xl bg-blue-500 text-white font-bold hover:scale-105 active:scale-95 transition-all outline-none disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                {saving ? "Analizando IA..." : "Registrar Sueño"}
              </button>
            </form>
          </div>
        </div>

        {/* GRAFICO Y FEEDBACK */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Promedio Semana", val: `${stats.avgHours.toFixed(1)}h`, icon: Clock },
              { label: "Mejor Noche", val: `${stats.bestNight.toFixed(1)}h`, icon: Star },
              { label: "Racha Activa (>7h)", val: `${stats.streak} días`, icon: Zap },
            ].map((stat, i) => (
              <div key={i} className="glass p-4 rounded-xl border border-white/5 flex gap-3 text-left items-start">
                <stat.icon className="w-4 h-4 text-primary shrink-0 opacity-80 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono line-clamp-1">{stat.label}</span>
                  <div className="text-xl font-bold text-white leading-tight">{stat.val}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl border border-white/5 p-6 md:p-8 flex flex-col flex-1">
            <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-widest text-xs font-mono">Últimos 7 Días (Historial UX)</h2>
            <p className="text-text-secondary text-sm mb-6">Tu balance metabólico depende 100% de esta métrica constante.</p>
            
            {/* GRÁFICO DE BARRAS CUSTOM CSS */}
            <div className="flex-1 flex flex-col justify-end mt-4 mb-8">
              <div className="w-full flex items-end justify-between h-40 gap-2 border-b border-white/10 pb-2 relative">
                {/* Línea objetivo 8 hrs */}
                <div className="absolute w-full border-t border-dashed border-white/20 top-1/4 left-0 pointer-events-none">
                  <span className="absolute -left-0 -top-5 text-[10px] text-text-muted font-mono bg-[#050505] pr-2">8h Óptimo</span>
                </div>
                
                {chartData.length > 0 ? chartData.map((d, i) => {
                  const h = Number(d.hours_slept || 0);
                  const maxH = 12; // cap para visualización
                  const height = `${Math.min((h / maxH) * 100, 100)}%`;
                  const isGood = h >= 7;

                  return (
                    <div key={i} className="flex flex-col items-center flex-1 group">
                      <div className="w-full max-w-[40px] bg-background border border-white/5 rounded-t-sm relative h-full flex items-end overflow-hidden hover:border-white/30 transition-colors">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height }}
                          transition={{ delay: i * 0.1, type: "spring" }}
                          className={`w-full rounded-t-sm ${isGood ? 'bg-blue-400' : 'bg-red-400/80'} shadow-[0_0_15px_rgba(96,165,250,0.1)]`}
                        />
                      </div>
                      <span className="text-[10px] text-text-muted mt-2 uppercase font-mono">{d.date.substring(5, 10).replace('-', '/')}</span>
                    </div>
                  );
                }) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-text-muted font-mono text-sm opacity-50">Ingresa datos para construir el gráfico</span>
                  </div>
                )}
              </div>
            </div>

            {/* ÚLTIMO FEEDBACK IA */}
            {history.length > 0 && (
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent to-blue-500/10 pointer-events-none" />
                <span className="text-xs font-mono uppercase tracking-widest text-blue-400 mb-1 block">Feedback IA Actual</span>
                <span className="text-sm font-medium text-white italic">
                  "{history[0].ai_feedback || "Continúa con tus hábitos de sueño actuales."}"
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
