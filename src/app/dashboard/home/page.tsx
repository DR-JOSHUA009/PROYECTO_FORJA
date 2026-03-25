"use client";

import { motion } from "framer-motion";
import { Activity, Flame, Dumbbell, GlassWater, Moon, Bot, Trophy, ChevronRight, Zap, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import WaterVessel from "@/components/dashboard/WaterVessel";
import { useToast } from "@/components/ui/Toast";

export default function DashboardHome() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [todayRoutine, setTodayRoutine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [targetCals, setTargetCals] = useState<number>(2500);
  const [waterMl, setWaterMl] = useState<number>(0);
  const [caloriesConsumed, setCaloriesConsumed] = useState<number>(0);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fats: 0 });
  const [lastSleep, setLastSleep] = useState<any>(null);
  const [lastCardio, setLastCardio] = useState<any>(null);
  const [weekWorkouts, setWeekWorkouts] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

      const { data: pData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(pData);

      if (pData) {
        const weight = pData.weight_kg || 70;
        const intensityMult = pData.intensity === "alta" ? 1.6 : pData.intensity === "media" ? 1.4 : 1.2;
        let cals = Math.round(weight * 22 * intensityMult);
        if (pData.goal === "cut") cals -= 500;
        if (pData.goal === "bulk") cals += 300;
        setTargetCals(cals);
      }

      const today = new Date().toISOString().split('T')[0];
      const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const dayName = days[new Date().getDay()];

      const { data: rData } = await supabase.from("routines").select("*").eq("user_id", user.id).eq("day_of_week", dayName).single();
      setTodayRoutine(rData);

      const { data: wData } = await supabase.from("water_logs").select("amount_ml").eq("user_id", user.id).eq("date", today);
      setWaterMl(wData?.reduce((acc, l) => acc + (l.amount_ml || 0), 0) || 0);

      const { data: fData } = await supabase.from("food_logs").select("calories, protein, carbs, fats").eq("user_id", user.id).eq("date", today);
      if (fData) {
        setCaloriesConsumed(fData.reduce((a, l) => a + (l.calories || 0), 0));
        setMacros({
          protein: Math.round(fData.reduce((a, l) => a + (l.protein || 0), 0)),
          carbs: Math.round(fData.reduce((a, l) => a + (l.carbs || 0), 0)),
          fats: Math.round(fData.reduce((a, l) => a + (l.fats || 0), 0)),
        });
      }

      // Último sueño
      const { data: sData } = await supabase.from("sleep_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(1);
      if (sData && sData.length > 0) setLastSleep(sData[0]);

      // Último cardio
      const { data: cData } = await supabase.from("cardio_sessions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(1);
      if (cData && cData.length > 0) setLastCardio(cData[0]);

      // Workouts esta semana
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: wkData } = await supabase.from("workout_logs").select("id").eq("user_id", user.id).gte("created_at", weekAgo.toISOString());
      setWeekWorkouts(wkData?.length || 0);

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const handleAddWater = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    const { error } = await supabase.from("water_logs").insert({
      user_id: user.id,
      amount_ml: 250,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      toast("Error al registrar agua", "error");
    } else {
      setWaterMl(prev => prev + 250);
      toast("💧 +250ml registrados", "success");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const targetWater = (profile?.weight_kg || 70) * 35;
  const waterPercentage = Math.min((waterMl / targetWater) * 100, 100);
  const caloriePercentage = Math.min((caloriesConsumed / targetCals) * 100, 100);
  const currentLevel = profile?.level || 1;
  const currentXp = profile?.xp || 0;
  const xpInLevel = currentXp % 1000;
  const greeting = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 18 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      
      {/* HEADER CON SALUDO PERSONALIZADO */}
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-text-secondary text-sm uppercase tracking-widest font-mono mb-1">{greeting}</p>
          <h1 className="text-3xl font-bold text-white">{profile?.full_name || "Atleta"}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">LVL</span>
              <span className="text-xl font-black text-white">{currentLevel}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">XP</span>
              <span className="text-xl font-black text-primary">{currentXp}</span>
            </div>
          </div>
        </div>
      </header>

      {/* XP PROGRESS BAR */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">Progreso al nivel {currentLevel + 1}</span>
          <span className="text-[10px] text-text-muted font-mono">{xpInLevel} / 1000 XP</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${xpInLevel / 10}%` }} className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(9,250,211,0.3)]" />
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Flame, title: "Calorías Obj.", value: targetCals, sub: "kcal/día", color: "text-orange-400" },
          { icon: Dumbbell, title: "Entrenos/Sem.", value: `${weekWorkouts}/${profile?.training_days || 5}`, sub: "completados", color: "text-white" },
          { icon: Moon, title: "Sueño", value: lastSleep ? `${Number(lastSleep.hours_slept).toFixed(1)}h` : "—", sub: "anoche", color: "text-blue-400" },
          { icon: Activity, title: "Cardio", value: lastCardio ? `${lastCardio.duration_min}min` : "—", sub: lastCardio?.activity || "sin registro", color: "text-cyan-400" },
        ].map((w, i) => (
          <motion.div
            key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="glass p-5 rounded-2xl border border-white/5 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-2 mb-3">
              <w.icon className={`w-4 h-4 ${w.color}`} />
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">{w.title}</span>
            </div>
            <span className="text-2xl font-bold text-white block">{w.value}</span>
            <span className="text-[10px] text-text-muted uppercase font-mono">{w.sub}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* RUTINA DEL DÍA */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted">Entrenamiento Programado</h2>
          <div className="glass p-8 rounded-2xl border border-white/5 h-full flex flex-col justify-center relative overflow-hidden group">
            
            {todayRoutine ? (
              todayRoutine.is_rest_day ? (
                <>
                  <Activity className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 group-hover:text-primary/5 transition-colors" />
                  <span className="text-xs text-blue-400 font-mono tracking-widest uppercase mb-2">Día de Descanso Activo</span>
                  <h3 className="text-4xl font-black text-white mb-4 leading-tight w-[80%]">Recuperación</h3>
                  <p className="text-text-secondary max-w-sm mb-8 text-sm leading-relaxed">Hoy el sistema indica recuperación. Enfócate en estiramientos y descanso.</p>
                  <Link href="/dashboard/sleep">
                    <button className="h-12 w-max px-8 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-all text-sm">
                      Registrar Sueño
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <Dumbbell className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 group-hover:text-primary/5 transition-colors" />
                  <span className="text-xs text-primary font-mono tracking-widest uppercase mb-2">Fase de Trabajo • {todayRoutine.day_of_week}</span>
                  <h3 className="text-4xl font-black text-white mb-4 leading-tight w-[80%]">
                    {todayRoutine.exercises?.length || 0} Ejercicios
                  </h3>
                  <p className="text-text-secondary max-w-sm mb-8 text-sm leading-relaxed">
                    Rutina lista. Activa el Modo Enfoque para una sesión inmersiva.
                  </p>
                  <Link href="/dashboard/gym">
                    <button className="h-12 w-max px-8 rounded-xl bg-white text-background font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-all text-sm relative z-10">
                      Iniciar Bloque →
                    </button>
                  </Link>
                </>
              )
            ) : (
              <>
                <Dumbbell className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5" />
                <span className="text-xs text-text-muted font-mono tracking-widest uppercase mb-2">No Programado</span>
                <h3 className="text-3xl font-black text-white mb-4">Sin rutina para hoy</h3>
                <p className="text-text-secondary max-w-sm mb-8 text-sm">Pide al agente IA que genere tu plan semanal.</p>
                <Link href="/dashboard/agent">
                  <button className="h-12 w-max px-8 rounded-xl border border-primary/20 bg-primary/5 text-primary font-bold hover:bg-primary/10 transition-all text-sm">
                    <Bot className="w-4 h-4 inline mr-2" />Hablar con FORJA
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* NUTRICIÓN Y AGUA */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted">Progreso Bio</h2>
          <div className="glass p-8 rounded-2xl border border-white/5 h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            
            <div className="mb-6 flex flex-col items-center">
              <WaterVessel percentage={waterPercentage} />
              <div className="mt-4 flex flex-col items-center">
                <span className="text-2xl font-bold text-white">{(waterMl / 1000).toFixed(1)}L</span>
                <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">de {(targetWater / 1000).toFixed(1)}L</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-4 mt-4 border-t border-white/5 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Calorías</span>
                <span className="text-white font-bold">{caloriesConsumed} <span className="text-text-muted font-normal">/ {targetCals}</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${caloriePercentage}%` }} className="h-full bg-white rounded-full" />
              </div>

              {[
                { label: "Proteína", val: macros.protein, max: 180, color: "bg-primary" },
                { label: "Carbohidratos", val: macros.carbs, max: 300, color: "bg-orange-400" },
                { label: "Grasas", val: macros.fats, max: 80, color: "bg-blue-400" },
              ].map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-text-secondary font-mono tracking-widest uppercase text-[10px]">{m.label}</span>
                    <span className="text-white font-bold">{m.val}g</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((m.val / m.max) * 100, 100)}%` }} className={`h-full ${m.color} rounded-full`} />
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddWater} className="mt-8 w-full group h-12 rounded-xl border border-primary/20 bg-primary/5 text-primary font-bold hover:bg-primary/10 transition-all active:scale-95 flex items-center justify-center gap-2">
              <GlassWater className="w-4 h-4" /> +250ml
            </button>
          </div>
        </div>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Agente IA", icon: Bot, href: "/dashboard/agent", color: "text-primary" },
          { label: "Logros", icon: Trophy, href: "/dashboard/achievements", color: "text-yellow-400" },
          { label: "Estadísticas", icon: TrendingUp, href: "/dashboard/stats", color: "text-white" },
          { label: "Cardio", icon: Zap, href: "/dashboard/cardio", color: "text-cyan-400" },
        ].map((link, i) => (
          <Link key={i} href={link.href}>
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
              className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-3">
                <link.icon className={`w-5 h-5 ${link.color}`} />
                <span className="text-sm font-medium text-white">{link.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-white group-hover:translate-x-1 transition-all" />
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
