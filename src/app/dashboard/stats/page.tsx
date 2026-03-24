"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Calendar, Target, Award, Activity, Heart, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon3D } from "@/components/ui/Icon3D";

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch consolidated stats
      const { data: cardio } = await supabase.from("cardio_sessions").select("*").eq("user_id", user.id);
      const { data: sleep } = await supabase.from("sleep_logs").select("*").eq("user_id", user.id);
      const { data: food } = await supabase.from("food_logs").select("*").eq("user_id", user.id);
      
      const totalKms = cardio?.reduce((acc, s) => acc + Number(s.distance_km || 0), 0) || 0;
      const totalMins = cardio?.reduce((acc, s) => acc + Number(s.duration_min || 0), 0) || 0;
      const avgSleep = sleep?.length ? (sleep.reduce((acc, s) => acc + Number(s.hours_slept || 0), 0) / sleep.length) : 0;
      const totalCals = food?.reduce((acc, f) => acc + Number(f.calories || 0), 0) || 0;

      setStats({
        cardio: { totalKms, totalMins, count: cardio?.length || 0 },
        sleep: { avgSleep, count: sleep?.length || 0 },
        diet: { totalCals, count: food?.length || 0 }
      });
      setLoading(false);
    }
    loadStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const sections = [
    { title: "Gimnasio", icon: Target, color: "#ffffff", val: "85%", desc: "Adherencia a la rutina" },
    { title: "Nutrición", icon: Heart, color: "#10b981", val: stats.diet.totalCals.toLocaleString(), desc: "Calorías totales registradas" },
    { title: "Cardio", icon: Activity, color: "#22d3ee", val: `${stats.cardio.totalKms.toFixed(1)} km`, desc: "Distancia total recorrida" },
    { title: "Recuperación", icon: Clock, color: "#60a5fa", val: `${stats.sleep.avgSleep.toFixed(1)}h`, desc: "Promedio de sueño diario" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          Estadísticas <Icon3D icon={BarChart3} color="white" size={32} />
        </h1>
        <p className="text-text-secondary">Tu progreso analizado por la inteligencia de FORJA.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {sections.map((sec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center group hover:border-white/20 transition-all"
          >
            <Icon3D icon={sec.icon} color={sec.color} size={40} className="mb-4" />
            <span className="text-3xl font-black text-white mb-1">{sec.val}</span>
            <span className="text-[10px] text-text-secondary uppercase tracking-[0.2em] font-mono mb-2">{sec.title}</span>
            <p className="text-xs text-text-muted">{sec.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* CHARTS PLACEHOLDER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-3xl border border-white/5 min-h-[400px] flex flex-col">
          <h2 className="text-lg font-bold text-white mb-8 border-b border-white/5 pb-4">Actividad Semanal</h2>
          <div className="flex-1 flex items-end justify-between gap-4">
            {[40, 70, 45, 90, 65, 30, 80].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <motion.div 
                  initial={{ height: 0 }} 
                  animate={{ height: `${h}%` }}
                  className="w-full bg-white/10 rounded-t-lg group-hover:bg-white transition-colors relative"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity">{h}%</div>
                </motion.div>
                <span className="text-[10px] text-text-muted font-mono">D{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/5 min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
          <h2 className="text-lg font-bold text-white mb-8 border-b border-white/5 pb-4">Distribución Metabólica</h2>
          <div className="flex-1 flex items-center justify-center p-10">
             <div className="relative w-48 h-48 rounded-full border-[12px] border-white/5 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[12px] border-white border-t-transparent border-r-transparent rotate-45" />
                <div className="flex flex-col items-center">
                  <span className="text-4xl font-black text-white">72%</span>
                  <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">Eficiencia</span>
                </div>
             </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white" /><span className="text-[10px] text-text-secondary font-mono">SUEÑO</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/40" /><span className="text-[10px] text-text-secondary font-mono">DIETA</span></div>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white/10" /><span className="text-[10px] text-text-secondary font-mono">GYM</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
