"use client";

import { motion } from "framer-motion";
import { BarChart3, Dumbbell, Apple, Wind, Moon, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function StatsModule() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    gym: { completed: 0, days: 0 },
    diet: { avgCals: 0, adherence: 0 },
    cardio: { kms: 0, mins: 0 },
    sleep: { avgHours: 0, bestStreak: 0 }
  });

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real app, you would fetch these from actual completed exercises logs.
      // We will perform basic counts from existing tables.
      const { data: cardioObj } = await supabase.from("cardio_sessions").select("distance_km, duration_min").eq("user_id", user.id);
      const { data: sleepObj } = await supabase.from("sleep_logs").select("hours_slept").eq("user_id", user.id);
      const { data: profileObj } = await supabase.from("users_profile").select("weight_kg").eq("user_id", user.id).single();

      let kms = 0; let mins = 0;
      if (cardioObj) {
        kms = cardioObj.reduce((a, b) => a + Number(b.distance_km || 0), 0);
        mins = cardioObj.reduce((a, b) => a + Number(b.duration_min || 0), 0);
      }

      let sleepAvg = 0; let bestStreak = 0;
      if (sleepObj && sleepObj.length > 0) {
        let total = sleepObj.reduce((a, b) => a + Number(b.hours_slept || 0), 0);
        sleepAvg = total / sleepObj.length;
        let streak = 0;
        sleepObj.forEach((s) => {
          if (s.hours_slept >= 7) streak++;
        });
        bestStreak = streak; // Simplified streak
      }

      setStats({
        gym: { completed: profileObj ? 14 : 0, days: profileObj ? 3 : 0 }, // MOCK para demo visual
        diet: { avgCals: profileObj ? 2300 : 0, adherence: profileObj ? 85 : 0 }, // MOCK
        cardio: { kms, mins },
        sleep: { avgHours: sleepAvg, bestStreak }
      });

      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Estadísticas <BarChart3 className="text-purple-400 w-6 h-6" />
          </h1>
          <p className="text-text-secondary">Visión general de tu desempeño analizado por IA.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { icon: Dumbbell, color: "text-primary", title: "Fuerza", value: `${stats.gym.completed}`, sub: "Volumen levantado" },
          { icon: Apple, color: "text-emerald-400", title: "Dieta", value: `${stats.diet.adherence}%`, sub: "Adherencia al plan" },
          { icon: Wind, color: "text-cyan-400", title: "Cardio", value: `${stats.cardio.kms.toFixed(1)} km`, sub: "Distancia total" },
          { icon: Moon, color: "text-blue-400", title: "Recuperación", value: `${stats.sleep.avgHours.toFixed(1)}h`, sub: "Promedio semana" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              key={i} className="glass p-6 rounded-2xl border border-white/5 relative overflow-hidden group"
            >
              <div className={`absolute -right-4 -top-4 w-24 h-24 ${stat.color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs uppercase font-mono tracking-widest text-text-secondary">{stat.title}</span>
                <Icon className={`w-5 h-5 ${stat.color} opacity-80`} />
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-[10px] uppercase font-mono tracking-wide text-text-muted">{stat.sub}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRÁFICO PROGRESO DE PESO (Mockeado para estructura sin Recharts) */}
        <div className="glass p-8 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
          <Trophy className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5" />
          <h2 className="text-lg font-bold text-white uppercase tracking-widest text-xs font-mono absolute top-6 left-6 z-10">Trayectoria de Peso (Próximamente)</h2>
          
          <div className="w-full flex-1 flex items-end justify-between px-4 z-10 opacity-70 mt-12 mb-4 h-40">
            {[72, 71.5, 71, 71.2, 70.8, 70.0, 69.5].map((w, index) => {
              const maxW = 75;
              const height = `${(w / maxW) * 100}%`;
              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="text-[10px] text-white/50 mb-2 font-mono">{w}kg</div>
                  <motion.div initial={{ height: 0 }} animate={{ height }} className="w-4 bg-white/20 rounded-t-sm" />
                </div>
              );
            })}
          </div>
        </div>

        {/* FEEDBACK HOLÍSTICO IA */}
        <div className="glass p-8 rounded-2xl border-l-[3px] border-l-purple-500/50 border-t-white/5 border-r-white/5 border-b-white/5 flex flex-col justify-center">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest text-xs font-mono mb-4 text-purple-400">Análisis Holístico IA</h2>
          <p className="text-sm text-white/90 leading-relaxed font-medium mb-6">
            Puntos fuertes detectados: Tienes una excelente racha de {stats.sleep.bestStreak} días durmiendo bien, lo que optimiza tu asimilación de hipertrofia.
            <br /><br />
            Área de mejora: El volumen de {stats.cardio.kms.toFixed(1)} km es un buen inicio, pero la IA sugiere añadir 50% extra de baja intensidad para acelerar oxidación oxidativa en base a tu dieta de {stats.diet.avgCals} kcal.
          </p>
          <div className="flex gap-4">
             <button className="h-10 px-6 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs uppercase tracking-widest font-mono transition-colors">
               Ver desglose muscular
             </button>
             <button className="h-10 px-6 border border-white/10 hover:border-white/30 text-white rounded-lg text-xs uppercase tracking-widest font-mono transition-colors">
               Hablar con IA
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}
