"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";
import { Wind, Activity, Timer, Zap, Map, TrendingUp } from "lucide-react";

export default function CardioModule() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ kms: 0, mins: 0, count: 0 });

  const [activity, setActivity] = useState("Caminata");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [saving, setSaving] = useState(false);

  // Feedback IA inmediato
  const [latestFeedback, setLatestFeedback] = useState<string | null>(null);

  const supabase = createClient();

  const recalcStats = (data: any[]) => {
    if (data) {
      let kms = 0; let mins = 0;
      data.forEach(s => {
        kms += Number(s.distance_km || 0);
        mins += Number(s.duration_min || 0);
      });
      setStats({ kms, mins, count: data.length });
    }
  };

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: hData } = await supabase
        .from("cardio_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setHistory(hData || []);
      recalcStats(hData || []);

      // Mostrar último feedback
      if (hData && hData.length > 0 && hData[0].ai_feedback) {
        setLatestFeedback(hData[0].ai_feedback);
      }

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const activities = [
    { name: "Correr", emoji: "🏃" },
    { name: "Caminata", emoji: "🚶" },
    { name: "Ciclismo", emoji: "🚴" },
    { name: "Natación", emoji: "🏊" },
    { name: "HIIT", emoji: "⚡" },
    { name: "Saltar Cuerda", emoji: "🪢" },
    { name: "Remo", emoji: "🚣" },
  ];

  const getIntensityLabel = (val: number) => {
    if (val <= 3) return "Suave";
    if (val <= 6) return "Moderada";
    if (val <= 8) return "Intensa";
    return "Máxima";
  };

  const getIntensityColor = (val: number) => {
    if (val <= 3) return "text-emerald-400";
    if (val <= 6) return "text-yellow-400";
    if (val <= 8) return "text-orange-400";
    return "text-red-400";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration) return;
    setSaving(true);
    setLatestFeedback(null);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const res = await fetch("/api/cardio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity,
          duration_min: Number(duration),
          distance_km: distance ? Number(distance) : null,
          intensity_level: intensity
        })
      });
      const data = await res.json();

      if (data.success) {
        // Mostrar feedback IA inmediato
        if (data.ai_feedback) {
          setLatestFeedback(data.ai_feedback);
        }

        // Recargar historial
        const { data: hData } = await supabase.from("cardio_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        setHistory(hData || []);
        recalcStats(hData || []);
        
        toast(`¡Cardio registrado! +${data.xp_earned || 200} XP 🏃`, "success");
      } else {
        toast("Error al guardar la sesión: " + data.error, "error");
      }
    }
    
    setDuration(""); setDistance(""); setIntensity(5); setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Cardio <Icon3D icon={Wind} color="#22d3ee" size={32} />
          </h1>
          <p className="text-text-secondary">Registra tu resistencia aeróbica y recibe feedback IA.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ===== FORMULARIO DE REGISTRO ===== */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass p-6 rounded-2xl border border-white/5">
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-6">Nueva Sesión</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Selector de actividad */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Actividad</label>
                <div className="flex flex-wrap gap-2">
                  {activities.map(act => (
                    <div 
                      key={act.name} 
                      onClick={() => setActivity(act.name)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all border active:scale-95 ${activity === act.name ? 'bg-white text-background border-white shadow-[0_0_15px_rgba(255,255,255,0.15)]' : 'bg-white/5 text-text-muted border-white/5 hover:bg-white/10 hover:text-white'}`}
                    >
                      <span className="mr-1">{act.emoji}</span> {act.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Duración y distancia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Duración (min)</label>
                  <input type="number" required value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-white focus:bg-white/5 transition-colors outline-none font-mono" placeholder="45" />
                </div>
                {["Correr", "Caminata", "Ciclismo", "Natación"].includes(activity) && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Distancia (km)</label>
                    <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-white focus:bg-white/5 transition-colors outline-none font-mono" placeholder="5.2" />
                  </div>
                )}
              </div>

              {/* Intensidad slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Intensidad</label>
                  <span className={`text-xs font-bold ${getIntensityColor(intensity)}`}>{getIntensityLabel(intensity)} ({intensity}/10)</span>
                </div>
                <input type="range" min="1" max="10" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-primary mt-2" />
                {/* Barra visual de intensidad */}
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 h-1.5 rounded-full transition-all ${
                        i < intensity 
                          ? (i < 3 ? "bg-emerald-400" : i < 6 ? "bg-yellow-400" : i < 8 ? "bg-orange-400" : "bg-red-400") 
                          : "bg-white/5"
                      }`} 
                    />
                  ))}
                </div>
              </div>

              <button disabled={saving} type="submit" className="h-12 w-full mt-2 rounded-xl bg-white text-background font-bold hover:scale-105 active:scale-95 transition-all outline-none focus:outline-none disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Analizando IA...
                  </>
                ) : "Guardar Sesión"}
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
                className="p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-transparent to-cyan-500/5 pointer-events-none" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-2 block font-bold">🏃 Feedback IA Post-Sesión</span>
                <span className="text-sm font-medium text-white/90 leading-relaxed italic">
                  "{latestFeedback}"
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== HISTORIAL Y STATS ===== */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Volumen Total", val: `${stats.mins}`, unit: "mins", icon: Timer },
              { label: "Distancia Total", val: `${stats.kms.toFixed(1)}`, unit: "km", icon: Map },
              { label: "Sesiones", val: `${stats.count}`, unit: "", icon: TrendingUp },
            ].map((stat, i) => (
              <div key={i} className="glass p-4 rounded-xl border border-white/5 hover:border-white/15 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{stat.val} <span className="text-sm text-text-muted font-normal">{stat.unit}</span></div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl border border-white/5 h-full p-6 flex flex-col">
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-6">Historial con Feedback IA</h2>
            
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
              {history.length > 0 ? history.map((session, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={session.id} 
                  className="flex flex-col p-4 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{session.activity}</span>
                        <span className="text-xs text-text-muted">{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="font-bold text-white">{session.duration_min} min</span>
                      {session.distance_km && <span className="text-xs text-cyan-400 font-mono">{session.distance_km} km</span>}
                      {session.intensity_level && (
                        <span className={`text-[10px] font-mono mt-0.5 ${getIntensityColor(session.intensity_level)}`}>
                          Intensidad {session.intensity_level}/10
                        </span>
                      )}
                    </div>
                  </div>
                  {session.ai_feedback && (
                    <div className="text-sm text-text-secondary leading-relaxed bg-background p-3 rounded-lg border border-white/5 mt-2">
                      <span className="text-cyan-400 italic mr-1">💬</span>
                      {session.ai_feedback}
                    </div>
                  )}
                </motion.div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center py-20 opacity-50">
                  <Wind className="w-12 h-12 mb-4" />
                  <p className="text-sm text-center">No hay sesiones de cardio recientes.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
