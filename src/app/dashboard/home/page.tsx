"use client";

import { motion } from "framer-motion";
import { Activity, Flame, UtilityPole, CheckCircle2, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardHome() {
  const [profile, setProfile] = useState<any>(null);
  const [todayRoutine, setTodayRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(pData);

      // Get today's day of week in Spanish (Lunes, Martes...)
      const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const today = days[new Date().getDay()];

      const { data: routineData } = await supabase.from("routines").select("*").eq("user_id", user.id).eq("day_of_week", today).single();
      setTodayRoutine(routineData || null);
      
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Calculate estimated calories based on weight & activity
  const baseBurn = (profile?.weight_kg || 70) * 22 * (profile?.intensity === "alta" ? 1.6 : 1.3);
  const targetCals = Math.round(baseBurn);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Resumen de Hoy</h1>
        <p className="text-text-secondary">Tu progreso y estado actual.</p>
      </header>

      {/* KPI WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Flame, title: "Calorías Objetivo", value: targetCals, sub: "kcals recomendadas", col: "text-orange-400 border-orange-400/20" },
          { icon: UtilityPole, title: "Nivel de Peso", value: profile?.weight_kg || 0, sub: "Kilogramos actuales", col: "text-white border-white/20" },
          { icon: Activity, title: "Edad", value: profile?.age || 0, sub: "Años biológicos", col: "text-primary border-primary/20" },
          { icon: CheckCircle2, title: "Días de entreno", value: profile?.training_days || 0, sub: "Días a la semana", col: "text-emerald-400 border-emerald-400/20" },
        ].map((widget, i) => {
          const Icon = widget.icon;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`glass p-6 rounded-2xl border-l-[3px] border-t-white/5 border-r-white/5 border-b-white/5 ${widget.col}`}
            >
              <div className="flex items-center gap-3 mb-4 text-text-secondary">
                <Icon className="w-5 h-5 flex-shrink-0 current-color" />
                <span className="text-sm font-medium tracking-wide">{widget.title}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">{widget.value}</span>
                <span className="text-xs text-text-muted mt-1">{widget.sub}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* RUTINA DEL DÍA */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(9,250,211,0.6)] animate-pulse" />
            Asignación Actual ({todayRoutine?.day_of_week || "Hoy"})
          </h2>
          <div className="glass p-6 rounded-2xl border border-white/5 h-full">
            {todayRoutine ? (
              todayRoutine.is_rest_day ? (
                <div className="flex flex-col items-center justify-center p-10 text-center gap-2 text-text-secondary">
                  <Activity className="w-10 h-10 text-primary opacity-50 mb-2" />
                  <span className="font-bold text-lg text-white">Día de Descanso Activo</span>
                  <span className="text-sm">Hoy no hay bloque programado. Enfócate en tu dieta y recuperación profunda.</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    {todayRoutine.exercises?.map((ej: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-white">{ej.name}</span>
                          <span className="text-xs text-text-secondary mt-1 tracking-wider uppercase">{ej.sets} Series • <span className="text-primary/70 font-mono">{ej.reps} Reps</span></span>
                        </div>
                        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center border-white/20"></div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 h-12 bg-white text-background font-bold rounded-xl hover:bg-white/90 transition-colors shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
                    Iniciar Bloque de Entrenamiento
                  </button>
                </>
              )
            ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center text-text-secondary">
                  <span className="mb-2 opacity-50"><Dumbbell className="w-8 h-8"/></span>
                  <span className="text-sm">No hay rutina asociada para este día según tu plan generado.</span>
                </div>
            )}
          </div>
        </div>

        {/* NUTRICIÓN Y AGUA */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white select-none">Progreso</h2>
          <div className="glass p-8 rounded-2xl border border-white/5 h-full flex flex-col items-center justify-center text-center relative">
            
            <div className="relative w-48 h-48 mb-8">
              {/* Circular Progress SVG */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <motion.circle 
                  cx="96" cy="96" r="88" fill="none" stroke="#fff" strokeWidth="12" 
                  strokeDasharray="552.92" // 2 * pi * 88
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * 0.85) }} // Mock 85% full
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tighter text-white">{(targetCals * 0.85).toFixed(0)}</span>
                <span className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Ingeridas</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Proteína</span>
                <span className="text-white font-bold">180g <span className="text-text-muted font-normal">/ 200g</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '90%' }} className="h-full bg-white" />
              </div>

              <div className="flex justify-between text-sm mt-2">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Agua</span>
                <span className="text-white font-bold text-primary">2.5L <span className="text-text-muted font-normal">/ 3.5L</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden flex cursor-pointer group" onClick={() => alert("Registrando vaso de agua...")}>
                <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="h-full bg-primary relative">
                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-white/30 to-transparent" />
                </motion.div>
                <div className="h-full flex-1 hover:bg-white/10 transition-colors" />
              </div>
            </div>

            <button onClick={() => alert("Añadiendo Agua...")} className="mt-6 w-full text-xs uppercase tracking-widest text-primary hover:text-white transition-colors py-2 border border-primary/20 rounded-lg hover:border-white/20">
              + Añadir Vaso (250ml)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
