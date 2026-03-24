"use client";

import { motion } from "framer-motion";
import { Activity, Flame, UtilityPole, CheckCircle2, Dumbbell, GlassWater } from "lucide-react";
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

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Sincronización de seguridad (por si el trigger falló)
      await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

      const { data: pData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(pData);
      
      // ... rest of loadData logic ...

      if (pData) {
        // Calculate TDEE
        const weight = pData.weight_kg || 70;
        const intensityMult = pData.intensity === "alta" ? 1.6 : pData.intensity === "media" ? 1.4 : 1.2;
        let cals = Math.round(weight * 22 * intensityMult);
        if (pData.goal === "cut") cals -= 500;
        if (pData.goal === "bulk") cals += 300;
        setTargetCals(cals);
      }

      // Load today's routine
      const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      const today = days[new Date().getDay()];

      const { data: rData } = await supabase.from("routines").select("*").eq("user_id", user.id).eq("day_of_week", today).single();
      setTodayRoutine(rData);

      // Fetch Water Logs for today
      const { data: wData } = await supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .eq("date", new Date().toISOString().split('T')[0]);
      
      const totalWater = wData ? wData.reduce((acc, log) => acc + (log.amount_ml || 0), 0) : 0;
      setWaterMl(totalWater);

      // Fetch Food Logs for calories and macros
      const { data: fData } = await supabase
        .from("food_logs")
        .select("calories, protein, carbs, fats")
        .eq("user_id", user.id)
        .eq("date", new Date().toISOString().split('T')[0]);
      
      if (fData) {
        setCaloriesConsumed(fData.reduce((acc, log) => acc + (log.calories || 0), 0));
        setMacros({
          protein: Math.round(fData.reduce((acc, log) => acc + (log.protein || 0), 0)),
          carbs: Math.round(fData.reduce((acc, log) => acc + (log.carbs || 0), 0)),
          fats: Math.round(fData.reduce((acc, log) => acc + (log.fats || 0), 0)),
        });
      }

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const handleAddWater = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Aseguar que el usuario existe en public.users (por si falló el trigger)
    await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    const { error } = await supabase.from("water_logs").insert({
      user_id: user.id,
      amount_ml: 250,
      date: new Date().toISOString().split('T')[0]
    });

    if (error) {
      console.error("Error al registrar agua:", error);
      // Podemos usar un alert simple o toast si lo tuviéramos importado
      alert("Error al registrar agua: Revisa tu conexión o perfil.");
    } else {
      setWaterMl(prev => prev + 250);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const targetWater = 3500;
  const waterPercentage = Math.min((waterMl / targetWater) * 100, 100);
  const caloriePercentage = Math.min((caloriesConsumed / targetCals) * 100, 100);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 font-mono tracking-tighter">SISTEMA ACTIVO</h1>
        <p className="text-text-secondary text-sm uppercase tracking-widest font-mono">Panel de Control Bio-Sincronizado</p>
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
                <span className="text-3xl font-bold text-white tracking-widest">{widget.value}</span>
                <span className="text-[10px] uppercase font-mono text-text-muted mt-1">{widget.sub}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* RUTINA DEL DÍA */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white select-none">Entrenamiento Programado</h2>
          <div className="glass p-8 rounded-2xl border border-white/5 h-full flex flex-col justify-center relative overflow-hidden group">
            
            {todayRoutine ? (
              todayRoutine.is_rest_day ? (
                <>
                  <Activity className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 group-hover:text-primary/5 transition-colors" />
                  <span className="text-xs text-primary font-mono tracking-widest uppercase mb-2">Día de Descanso Activo</span>
                  <h3 className="text-4xl font-black text-white mb-4 leading-tight w-[80%]">Recuperación</h3>
                  <p className="text-text-secondary max-w-sm mb-8 text-sm leading-relaxed">Hoy el sistema indica recuperación. Enfócate en estiramientos y descanso total.</p>
                </>
              ) : (
                <>
                  <Dumbbell className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 group-hover:text-primary/5 transition-colors" />
                  <span className="text-xs text-primary font-mono tracking-widest uppercase mb-2">Fase de Trabajo • {todayRoutine.day_of_week}</span>
                  <h3 className="text-4xl font-black text-white mb-4 leading-tight w-[80%]">
                    {todayRoutine.exercises?.length || 0} Ejercicios
                  </h3>
                  <p className="text-text-secondary max-w-sm mb-8 text-sm leading-relaxed">
                    Rutina lista. Hoy toca exigir el sistema al máximo según los parámetros calculados.
                  </p>
                  <Link href="/dashboard/gym">
                    <button className="h-12 w-max px-8 rounded-xl bg-white text-background font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-all text-sm relative z-10">
                      Iniciar Bloque
                    </button>
                  </Link>
                </>
              )
            ) : (
              <>
                <Dumbbell className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 group-hover:text-primary/5 transition-colors" />
                <span className="text-xs text-text-muted font-mono tracking-widest uppercase mb-2">No Programado</span>
                <h3 className="text-4xl font-black text-white mb-4 leading-tight w-[80%] uppercase">Pendiente</h3>
                <p className="text-text-secondary max-w-sm mb-8 text-sm leading-relaxed">Todavía no tienes un plan para hoy. Visita el agente de IA para crear tu bloque.</p>
              </>
            )}

          </div>
        </div>

        {/* NUTRICIÓN Y AGUA */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white select-none">Progreso Bio</h2>
          <div className="glass p-8 rounded-2xl border border-white/5 h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            
            <div className="mb-6 flex flex-col items-center">
              <WaterVessel percentage={waterPercentage} />
              <div className="mt-4 flex flex-col items-center">
                <span className="text-2xl font-bold text-white">{(waterMl / 1000).toFixed(1)}L</span>
                <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">Hidratación</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-4 mt-6 border-t border-white/5 pt-6">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Calorías</span>
                <span className="text-white font-bold">{caloriesConsumed} <span className="text-text-muted font-normal">/ {targetCals}</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${caloriePercentage}%` }} className="h-full bg-white" />
              </div>

              <div className="flex justify-between text-sm mt-3">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-[10px]">Proteína</span>
                <span className="text-white font-bold">{macros.protein}g</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((macros.protein/180)*100, 100)}%` }} className="h-full bg-primary" />
              </div>

              <div className="flex justify-between text-sm mt-2">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-[10px]">Carbohidratos</span>
                <span className="text-white font-bold">{macros.carbs}g</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((macros.carbs/300)*100, 100)}%` }} className="h-full bg-orange-400" />
              </div>

              <div className="flex justify-between text-sm mt-2">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-[10px]">Grasas</span>
                <span className="text-white font-bold">{macros.fats}g</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((macros.fats/80)*100, 100)}%` }} className="h-full bg-blue-400" />
              </div>
            </div>

            <button onClick={handleAddWater} className="mt-8 w-full group relative overflow-hidden h-12 rounded-xl border border-primary/20 bg-primary/5 text-primary font-bold hover:bg-primary/10 transition-all active:scale-95">
              <span className="flex items-center justify-center gap-2 relative z-10">
                <GlassWater className="w-4 h-4" />
                +250ml
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
