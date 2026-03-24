"use client";

import { motion } from "framer-motion";
import { Activity, Thermometer, MapPin, Search, Wind, Droplets } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CardioModule() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ kms: 0, mins: 0, count: 0 });

  const [activity, setActivity] = useState("Caminata");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState(5);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

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

      if (hData) {
        let kms = 0; let mins = 0;
        hData.forEach(s => {
          kms += Number(s.distance_km || 0);
          mins += Number(s.duration_min || 0);
        });
        setStats({ kms, mins, count: hData.length });
      }

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const activities = ["Correr", "Caminata", "Ciclismo", "Natación", "HIIT", "Remo", "Otro"];

  const getIntensityLabel = (val: number) => {
    if (val <= 3) return "Suave";
    if (val <= 6) return "Moderada";
    if (val <= 8) return "Intensa";
    return "Máxima";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration) return;
    setSaving(true);
    
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
        // Recargar
        const { data: hData } = await supabase.from("cardio_sessions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        setHistory(hData || []);
        
        let kms = 0; let mins = 0;
        hData?.forEach(s => {
          kms += Number(s.distance_km || 0);
          mins += Number(s.duration_min || 0);
        });
        setStats({ kms, mins, count: hData?.length || 0 });
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
            Cardio <Wind className="text-cyan-400 w-6 h-6" />
          </h1>
          <p className="text-text-secondary">Registra tu resistencia aeróbica.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO DE REGISTRO */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass p-6 rounded-2xl border border-white/5 h-full">
            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-xs font-mono">Nueva Sesión</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Actividad</label>
                <div className="flex flex-wrap gap-2">
                  {activities.map(act => (
                    <div 
                      key={act} 
                      onClick={() => setActivity(act)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${activity === act ? 'bg-white text-background border-white' : 'bg-white/5 text-text-muted border-white/5 hover:bg-white/10 hover:text-white'}`}
                    >
                      {act}
                    </div>
                  ))}
                </div>
              </div>

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

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Intensidad Perceptible</label>
                  <span className="text-xs font-bold text-primary">{getIntensityLabel(intensity)} ({intensity}/10)</span>
                </div>
                <input type="range" min="1" max="10" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="w-full accent-primary mt-2" />
              </div>

              <button disabled={saving} type="submit" className="h-12 w-full mt-4 rounded-xl bg-white text-background font-bold hover:scale-105 active:scale-95 transition-all outline-none focus:outline-none disabled:opacity-50">
                {saving ? "Registrando..." : "Guardar Sesión"}
              </button>
            </form>
          </div>
        </div>

        {/* HISTORIAL Y STATS */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="glass p-4 rounded-xl border border-white/5">
              <span className="text-xs text-text-secondary uppercase tracking-widest font-mono">Volumen</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.mins} <span className="text-sm text-text-muted font-normal">mins</span></div>
            </div>
            <div className="glass p-4 rounded-xl border border-white/5">
              <span className="text-xs text-text-secondary uppercase tracking-widest font-mono">Recorrido</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.kms.toFixed(1)} <span className="text-sm text-text-muted font-normal">km</span></div>
            </div>
            <div className="glass p-4 rounded-xl border border-white/5">
              <span className="text-xs text-text-secondary uppercase tracking-widest font-mono">Sesiones</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.count}</div>
            </div>
          </div>

          <div className="glass rounded-2xl border border-white/5 h-full p-6 flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-xs font-mono">Historial AI Feedback</h2>
            
            <div className="flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
              {history.length > 0 ? history.map((session, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  key={session.id} 
                  className="flex flex-col p-4 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white">
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
                    </div>
                  </div>
                  <div className="text-sm text-text-secondary leading-relaxed bg-background p-3 rounded-lg border border-white/5 mt-2 font-medium">
                    <span className="text-primary italic mr-2">"</span>
                    {session.ai_feedback || "Buen esfuerzo, sigue así."}
                  </div>
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
