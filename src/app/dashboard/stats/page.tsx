"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Calendar, Target, Award, Activity, Heart, Clock, Flame, Droplet, Moon, Dumbbell, Crown, Lock, Cpu } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon3D } from "@/components/ui/Icon3D";

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activityGrid, setActivityGrid] = useState<{ date: string; count: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [dailyCheckins, setDailyCheckins] = useState<any[]>([]);
  const [todayStats, setTodayStats] = useState<any>({ eaten: 0, burned: 0, activities: 0 });
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(profileData);

      // Fetch all data
      const { data: cardio } = await supabase.from("cardio_sessions").select("*").eq("user_id", user.id);
      const { data: sleep } = await supabase.from("sleep_logs").select("*").eq("user_id", user.id);
      const { data: food } = await supabase.from("food_logs").select("*").eq("user_id", user.id);
      const { data: water } = await supabase.from("water_logs").select("*").eq("user_id", user.id);
      const { data: workouts } = await supabase.from("workout_logs").select("*").eq("user_id", user.id);
      const { data: checkins } = await supabase.from("daily_checkins").select("*").eq("user_id", user.id).order("date", { ascending: false });
      
      setDailyCheckins(checkins || []);
      
      const totalKms = cardio?.reduce((acc, s) => acc + Number(s.distance_km || 0), 0) || 0;
      const totalMins = cardio?.reduce((acc, s) => acc + Number(s.duration_min || 0), 0) || 0;
      const avgSleep = sleep?.length ? (sleep.reduce((acc, s) => acc + Number(s.hours_slept || 0), 0) / sleep.length) : 0;
      const totalCals = food?.reduce((acc, f) => acc + Number(f.calories || 0), 0) || 0;
      const totalWater = water?.reduce((acc, w) => acc + Number(w.amount_ml || 0), 0) || 0;

      // Calcular adherencia semanal (últimos 7 días con workout_logs)
      const now = new Date();
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      const recentWorkouts = workouts?.filter(w => new Date(w.created_at) >= weekAgo) || [];
      const trainingDays = profileData?.training_days || 5;
      const adherence = Math.min(Math.round((recentWorkouts.length / trainingDays) * 100), 100);

      // Weekly activity data (últimos 7 días - actividades por día)
      const weekData: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        let dayCount = 0;
        dayCount += workouts?.filter(w => w.created_at?.split('T')[0] === dateStr).length || 0;
        dayCount += cardio?.filter(c => c.date === dateStr).length || 0;
        dayCount += sleep?.filter(s => s.date === dateStr).length || 0;
        dayCount += food?.filter(f => f.date === dateStr).length || 0;
        dayCount += water?.filter(w => w.date === dateStr).length || 0;
        weekData.push(dayCount);
      }
      setWeeklyData(weekData);

      // ===== GITHUB ACTIVITY GRID (últimos 90 días) =====
      const gridData: { date: string; count: number }[] = [];
      for (let i = 89; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        let count = 0;
        count += workouts?.filter(w => w.created_at?.split('T')[0] === dateStr).length || 0;
        count += cardio?.filter(c => c.date === dateStr).length || 0;
        count += sleep?.filter(s => s.date === dateStr).length || 0;
        count += (food?.filter(f => f.date === dateStr).length || 0) > 0 ? 1 : 0; // cap food logs as 1
        count += (water?.filter(w => w.date === dateStr).length || 0) > 0 ? 1 : 0; // cap water logs as 1
        gridData.push({ date: dateStr, count });
      }
      setActivityGrid(gridData);

      setStats({
        cardio: { totalKms, totalMins, count: cardio?.length || 0 },
        sleep: { avgSleep, count: sleep?.length || 0 },
        diet: { totalCals, count: food?.length || 0 },
        water: { totalMl: totalWater },
        workouts: { count: workouts?.length || 0 },
        adherence
      });

      const todayStr = new Date().toISOString().split('T')[0];
      const todayEaten = food?.filter(f => f.date === todayStr).reduce((acc, f) => acc + Number(f.calories || 0), 0) || 0;
      const todayCardioCount = cardio?.filter(c => c.date === todayStr).length || 0;
      let todayBurned = cardio?.filter(c => c.date === todayStr).reduce((acc, c) => acc + (Number(c.duration_min || 0) * 10), 0) || 0;
      const todayWorkouts = workouts?.filter(w => w.created_at?.split('T')[0] === todayStr).length || 0;
      todayBurned += todayWorkouts * 300;
      
      setTodayStats({
        eaten: todayEaten,
        burned: todayBurned,
        activities: todayCardioCount + todayWorkouts,
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
    { title: "Adherencia", icon: Target, color: "#ffffff", val: `${stats.adherence}%`, desc: "Cumplimiento semanal" },
    { title: "Nutrición", icon: Flame, color: "#f97316", val: stats.diet.totalCals.toLocaleString(), desc: "Calorías totales" },
    { title: "Cardio", icon: Activity, color: "#22d3ee", val: `${stats.cardio.totalKms.toFixed(1)} km`, desc: "Distancia total" },
    { title: "Sueño", icon: Moon, color: "#60a5fa", val: `${stats.sleep.avgSleep.toFixed(1)}h`, desc: "Promedio diario" },
  ];

  // GitHub grid helpers
  const getGridColor = (count: number) => {
    if (count === 0) return "bg-white/[0.03] border-white/5";
    if (count === 1) return "bg-emerald-500/20 border-emerald-500/10";
    if (count === 2) return "bg-emerald-500/40 border-emerald-500/20";
    if (count === 3) return "bg-emerald-500/60 border-emerald-500/30";
    return "bg-emerald-500/80 border-emerald-500/40";
  };

  const maxWeekly = Math.max(...weeklyData, 1);
  const dayNames = ["D-6", "D-5", "D-4", "D-3", "D-2", "Ayer", "Hoy"];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Estadísticas <Icon3D icon={BarChart3} color="white" size={32} />
          </h1>
          <p className="text-text-secondary">Tu progreso analizado por la inteligencia de FORJA.</p>
        </div>
        <div className="glass p-4 rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">Nivel</span>
            <span className="text-2xl font-black text-white">{profile?.level || 1}</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">XP Total</span>
            <span className="text-2xl font-black text-primary">{profile?.xp || 0}</span>
          </div>
        </div>
      </header>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {sections.map((sec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 rounded-2xl border border-white/5 flex flex-col items-center text-center group hover:border-white/20 transition-all"
          >
            <Icon3D icon={sec.icon} color={sec.color} size={36} className="mb-3" />
            <span className="text-2xl md:text-3xl font-black text-white mb-1">{sec.val}</span>
            <span className="text-[10px] text-text-secondary uppercase tracking-widest font-mono">{sec.title}</span>
            <p className="text-[10px] text-text-muted mt-1">{sec.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* WEEKLY ACTIVITY BAR CHART */}
        <div className="glass p-8 rounded-3xl border border-white/5 min-h-[350px] flex flex-col">
          <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Actividad Semanal</h2>
          <p className="text-text-secondary text-sm mb-8">Registros totales por día (entrenamientos, cardio, comida, agua, sueño).</p>
          <div className="flex-1 flex items-end justify-between gap-3">
            {weeklyData.map((count, i) => {
              const percentage = maxWeekly > 0 ? (count / maxWeekly) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: `${Math.max(percentage, 4)}%` }}
                    transition={{ delay: i * 0.1, type: "spring", stiffness: 80 }}
                    className={`w-full rounded-t-xl transition-colors relative ${
                      i === 6 ? "bg-primary shadow-[0_0_20px_rgba(9,250,211,0.2)]" : "bg-white/10 group-hover:bg-white/30"
                    }`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {count}
                    </div>
                  </motion.div>
                  <span className={`text-[10px] font-mono ${i === 6 ? "text-primary font-bold" : "text-text-muted"}`}>{dayNames[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* MACRO DISTRIBUTION */}
        <div className="glass p-8 rounded-3xl border border-white/5 min-h-[350px] flex flex-col relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
          <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Resumen General</h2>
          <p className="text-text-secondary text-sm mb-8">Métricas acumuladas de toda tu trayectoria.</p>
          
          <div className="flex-1 flex flex-col gap-5 justify-center">
            {[
              { label: "Entrenamientos", val: stats.workouts.count, icon: Dumbbell, color: "bg-white" },
              { label: "Sesiones Cardio", val: stats.cardio.count, icon: Activity, color: "bg-cyan-400" },
              { label: "Minutos Activos", val: `${stats.cardio.totalMins + (stats.workouts.count * 45)}`, icon: Clock, color: "bg-orange-400" },
              { label: "Registros Sueño", val: stats.sleep.count, icon: Moon, color: "bg-blue-400" },
              { label: "Agua Total", val: `${(stats.water.totalMl / 1000).toFixed(1)}L`, icon: Droplet, color: "bg-blue-300" },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-4 group"
              >
                <div className={`w-8 h-8 rounded-lg ${item.color}/10 flex items-center justify-center border border-white/5`}>
                  <item.icon className="w-4 h-4 text-white/60" />
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <span className="text-sm text-text-secondary group-hover:text-white transition-colors">{item.label}</span>
                  <span className="text-lg font-bold text-white font-mono">{item.val}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== FREE TIER: RESUMEN DE HOY ===== */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/5 mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-6">Tu Seguimiento de Hoy</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Target className="w-3 h-3 text-primary" /> Actividad Realizada</span>
            <span className="text-4xl font-black text-white">{todayStats.activities} <span className="text-sm text-text-muted font-normal">sesiones</span></span>
          </div>
          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-linear-to-r from-orange-400 to-red-500" />
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Flame className="w-3 h-3 text-orange-400" /> Kcal Quemadas Est.</span>
            <span className="text-4xl font-black text-white">{todayStats.burned} <span className="text-sm text-text-muted font-normal">kcal</span></span>
          </div>
          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3 text-cyan-400" /> Kcal Consumidas</span>
            <span className="text-4xl font-black text-white">{todayStats.eaten} <span className="text-sm text-text-muted font-normal">kcal</span></span>
          </div>
        </div>
      </div>

      {/* ===== FREE TIER: WEEKLY & STREAK (Replaces Github Grid) ===== */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/5 mb-8">
        <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-6">Tu Desempeño General</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-linear-to-r from-orange-500 to-yellow-500" />
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Flame className="w-3 h-3 text-orange-500" /> Racha Actual</span>
            <span className="text-4xl font-black text-white">{(() => {
              let streak = 0;
              for (let i = activityGrid.length - 1; i >= 0; i--) {
                if (activityGrid[i].count > 0) streak++;
                else break;
              }
              return streak;
            })()} <span className="text-sm text-text-muted font-normal">días</span></span>
          </div>
          
          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Calendar className="w-3 h-3 text-blue-400" /> Constancia (90)</span>
            <span className="text-3xl font-black text-white">{activityGrid.filter(d => d.count > 0).length} <span className="text-sm text-text-muted font-normal">/ 90</span></span>
          </div>

          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Target className="w-3 h-3 text-primary" /> Mejor Día Semanal</span>
            <span className="text-2xl font-black text-primary mt-1">{dayNames[weeklyData.indexOf(Math.max(...weeklyData))] || "N/A"}</span>
          </div>

          <div className="p-5 bg-white/5 rounded-2xl flex flex-col justify-center items-center text-center border border-white/5">
            <span className="text-[10px] text-text-secondary uppercase font-mono tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3 text-purple-400" /> Impacto Semanal</span>
            <span className="text-3xl font-black text-white">{weeklyData.reduce((a,b)=>a+b, 0)} <span className="text-sm text-text-muted font-normal flex flex-col leading-tight">Acciones</span></span>
          </div>
        </div>
      </div>

      {/* ===== PRO EXCLUSIVE SECTIONS ===== */}
      <div className="mt-8 flex flex-col gap-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-mono text-yellow-400 uppercase tracking-[0.3em] font-bold flex items-center gap-2">
            <Crown className="w-3 h-3" /> Estadísticas PRO
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* PRO SECTION 1: Auditoría Diaria IA (Smart Check-In) */}
        <div className="glass rounded-3xl border border-white/5 overflow-hidden relative">
          <div className={`p-8 ${profile?.plan !== 'pro' ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Auditoría Diaria Inteligente</h2>
            <p className="text-text-secondary text-sm mb-6">El desglose crudo de tu último reporte procesado por FORJA.</p>
            
            {dailyCheckins.length > 0 ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Macros & Balance */}
                  <div className="flex-1 glass p-6 rounded-2xl border border-white/5 bg-background/60">
                    <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono mb-4 flex items-center gap-2">
                       <Flame className="w-3 h-3 text-orange-400"/> Balance: {dailyCheckins[0].label}
                    </span>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-black text-white">{dailyCheckins[0].calories_eaten}</span>
                      <span className="text-xs text-text-muted uppercase font-mono tracking-widest">In /</span>
                      <span className="text-3xl font-black text-primary ml-1">{dailyCheckins[0].tdee}</span>
                      <span className="text-[10px] text-primary/60 uppercase font-mono tracking-widest">TDEE</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                       <div className="bg-white/5 p-3 rounded-xl flex justify-between items-center border border-white/5">
                         <span className="text-[10px] uppercase font-mono text-text-muted">Proteína</span>
                         <span className="font-bold text-white text-sm">{dailyCheckins[0].protein_g}g</span>
                       </div>
                       <div className="bg-white/5 p-3 rounded-xl flex justify-between items-center border border-white/5">
                         <span className="text-[10px] uppercase font-mono text-text-muted">Carbs</span>
                         <span className="font-bold text-white text-sm">{dailyCheckins[0].carbs_g}g</span>
                       </div>
                    </div>

                    <div className="mt-2 flex justify-between items-center bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-xs">
                      <span className="text-text-secondary">Diferencia Neta:</span>
                      <span className="font-black text-white">{dailyCheckins[0].balance}</span>
                    </div>
                  </div>

                  {/* Lectura & Recomendación */}
                  <div className="flex-[1.5] flex flex-col gap-4">
                    <div className="glass p-6 rounded-2xl border border-primary/20 bg-primary/5 flex-1 relative overflow-hidden group">
                       <Cpu className="absolute -right-4 -bottom-4 w-32 h-32 text-primary/10 group-hover:scale-110 group-hover:text-primary/20 transition-all duration-500" />
                       <span className="text-[10px] text-primary uppercase tracking-widest font-mono mb-3 flex items-center gap-2">
                         <Cpu className="w-3 h-3"/> Lectura Oficial FORJA
                       </span>
                       <p className="text-sm text-white/90 leading-relaxed font-medium relative z-10">"{dailyCheckins[0].reading}"</p>
                    </div>

                    {dailyCheckins[0].recommendation && (
                      <div className="glass p-6 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden">
                        <span className="text-[10px] text-yellow-500 uppercase tracking-widest font-mono mb-2 flex items-center gap-2">
                          <Target className="w-3 h-3"/> Instrucción de Cierre
                        </span>
                        <p className="text-sm text-yellow-100/80 leading-relaxed relative z-10">{dailyCheckins[0].recommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center px-2">
                   <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Último reporte: {new Date(dailyCheckins[0].date).toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
                </div>
              </div>
            ) : (
               <div className="py-16 glass rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                 <Cpu className="w-8 h-8 text-white/10 mb-4" />
                 <span className="text-sm font-bold text-white mb-1">Sin datos de la Inteligencia</span>
                 <p className="text-xs text-text-secondary max-w-sm">Ve al Agente IA y cuéntale qué comiste y entrenaste hoy para generar tu primera auditoría nutricional.</p>
               </div>
            )}
            
          </div>
          {/* PRO Overlay */}
          {profile?.plan !== 'pro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/60 backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-yellow-400" />
              </div>
              <span className="text-sm font-black text-white mb-1">Auditoría Diaria Inteligente</span>
              <span className="text-xs text-text-secondary mb-5 w-72 text-center">FORJA analiza tu voz en lenguaje natural, disecciona tus macros consumidos vs quemados, y genera una auditoría perfecta al cerrar el día.</span>
              <button className="h-10 px-6 rounded-xl bg-linear-to-r from-yellow-500 to-orange-500 text-background font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all">
                Desbloquear con PRO
              </button>
            </div>
          )}
        </div>

        {/* PRO SECTION 2: Trazador de Objetivo Médico/Físico */}
        <div className="glass rounded-3xl border border-white/5 overflow-hidden relative">
          <div className={`p-8 ${profile?.plan !== 'pro' ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Seguimiento de Objetivo Físico</h2>
            <p className="text-text-secondary text-sm mb-6">El estado actual hacia tu meta corporal registrada en FORJA.</p>
            
            <div className="flex flex-col md:flex-row gap-8 items-center mb-8">
              {/* Peso Progress */}
              <div className="flex-1 w-full bg-white/5 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                 <Target className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
                 <div className="flex justify-between items-end mb-4 relative z-10">
                   <div>
                     <span className="text-[10px] font-mono uppercase text-text-muted block mb-1">Peso Actual</span>
                     <span className="text-3xl font-black text-white">{profile?.weight || 0} kg</span>
                   </div>
                   <div className="text-right">
                     <span className="text-[10px] font-mono uppercase text-text-muted block mb-1">Objetivo</span>
                     <span className="text-3xl font-black text-primary">{profile?.target_weight || 0} kg</span>
                   </div>
                 </div>
                 
                 <div className="w-full h-3 bg-background rounded-full overflow-hidden relative z-10">
                    <div 
                      className="h-full bg-linear-to-r from-primary to-cyan-400 rounded-full" 
                      style={{ 
                        width: `${Math.min(
                          (profile?.target_weight && profile?.weight 
                            ? (profile.goal === 'bajar' 
                                ? ((100 - profile.weight) / (100 - profile.target_weight) * 100) 
                                : (profile.weight / profile.target_weight * 100)
                              ) 
                            : 0), 100)}%` 
                      }} 
                    />
                 </div>
                 <p className="text-xs text-text-muted mt-3 font-mono relative z-10">Meta: {profile?.goal === 'bajar' ? 'Déficit Calórico' : (profile?.goal === 'subir_musculo' ? 'Superávit Limpio' : 'Mantenimiento')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest flex items-center gap-2 mb-2"><Flame className="w-3 h-3"/> Kcal Recomendada (Diaria)</span>
                <span className="text-2xl font-black text-white">{dailyCheckins.length > 0 ? (profile?.goal === 'bajar' ? Math.round(dailyCheckins[0].tdee * 0.8) : (profile?.goal === 'subir_musculo' ? Math.round(dailyCheckins[0].tdee * 1.15) : dailyCheckins[0].tdee)) : 2200}</span>
                <span className="text-xs text-text-muted ml-1 font-mono">kcal objetivo</span>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest flex items-center gap-2 mb-2"><Droplet className="w-3 h-3"/> Consumo Actual Hoy</span>
                <span className="text-2xl font-black text-white">{todayStats.eaten}</span>
                <span className="text-xs text-text-muted ml-1 font-mono">kcal reportadas</span>
              </div>
            </div>
          </div>
          {/* PRO Overlay */}
          {profile?.plan !== 'pro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/60 backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-yellow-400" />
              </div>
              <span className="text-sm font-black text-white mb-1">Trazador de Objetivo Físico</span>
              <span className="text-xs text-text-secondary mb-4 w-72 text-center">Rastrea la distancia milimétrica entre tu peso actual y tu físico soñado.</span>
              <button className="h-10 px-6 rounded-xl bg-linear-to-r from-yellow-500 to-orange-500 text-background font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all">
                Desbloquear con PRO
              </button>
            </div>
          )}
        </div>

        {/* PRO SECTION 3: Recuperación vs Fricción (Sueño & Cardio) */}
        <div className="glass rounded-3xl border border-white/5 overflow-hidden relative">
          <div className={`p-8 ${profile?.plan !== 'pro' ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Recuperación vs Desgaste (Híbrido)</h2>
            <p className="text-text-secondary text-sm mb-6">Correlación entre tu descanso celular y tu fatiga cardiovascular.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Activity className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono">Horas en Cardio</span>
                  <div className="text-3xl font-black text-white">{(stats.cardio.totalMins / 60).toFixed(1)} <span className="text-xs font-normal text-text-muted">hrs</span></div>
                </div>
              </div>

              <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] text-blue-400 uppercase tracking-widest font-mono">Horas Promedio de Sueño</span>
                  <div className="text-3xl font-black text-white">{stats.sleep.avgSleep.toFixed(1)} <span className="text-xs font-normal text-text-muted">hrs/día</span></div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-5 bg-white/5 rounded-2xl border border-white/10 flex gap-4 items-start">
               <Heart className="w-5 h-5 text-primary shrink-0 mt-1" />
               <div>
                 <span className="text-xs font-bold text-white mb-1 block">Análisis Biométrico Simulado</span>
                 <p className="text-sm text-text-secondary leading-relaxed font-mono">
                   {stats.sleep.avgSleep >= 7 
                     ? "Descanso en nivel óptimo. Continúa con tu volumen actual de desgaste cardiovascular. Tu sistema nervioso central está compensando la fatiga agresivamente." 
                     : "Alerta de Recuperación. Tienes un volumen de cardio o estrés físico que no está siendo recompensado con horas suficientes de fase REM. Ajusta tu horario de cama para evitar lesiones u overtraining."}
                 </p>
               </div>
            </div>
          </div>
          {/* PRO Overlay */}
          {profile?.plan !== 'pro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/60 backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-yellow-400" />
              </div>
              <span className="text-sm font-black text-white mb-1">Analítica Biométrica Híbrida</span>
              <span className="text-xs text-text-secondary mb-4 w-72 text-center">Correlaciona tu carga de entrenamiento con tu calidad de descanso profundo.</span>
              <button className="h-10 px-6 rounded-xl bg-linear-to-r from-yellow-500 to-orange-500 text-background font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all">
                Desbloquear con PRO
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
