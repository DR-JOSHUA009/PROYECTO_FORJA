"use client";

import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Calendar, Target, Award, Activity, Heart, Clock, Flame, Droplet, Moon, Dumbbell, Crown, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon3D } from "@/components/ui/Icon3D";

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activityGrid, setActivityGrid] = useState<{ date: string; count: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
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

      {/* ===== GITHUB-STYLE ACTIVITY GRID ===== */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-1">Consistencia (90 días)</h2>
            <p className="text-text-secondary text-sm">Cada celda representa un día. Más color = más actividad registrada.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted font-mono">Menos</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div key={level} className={`w-3 h-3 rounded-sm border ${getGridColor(level)}`} />
            ))}
            <span className="text-[10px] text-text-muted font-mono">Más</span>
          </div>
        </div>

        {/* Grid: 13 columns (weeks) x 7 rows (days) */}
        <div className="overflow-x-auto pb-2">
          <div className="grid gap-[3px] min-w-[500px]" style={{ gridTemplateColumns: `repeat(${Math.ceil(activityGrid.length / 7)}, 1fr)`, gridTemplateRows: "repeat(7, 1fr)" }}>
            {activityGrid.map((day, i) => {
              const dayOfWeek = new Date(day.date).getDay();
              const isToday = day.date === new Date().toISOString().split('T')[0];
              return (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.003 }}
                  title={`${day.date}: ${day.count} actividades`}
                  className={`aspect-square rounded-sm border cursor-pointer transition-all hover:scale-125 hover:z-10 ${getGridColor(day.count)} ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                  style={{ gridRow: dayOfWeek + 1 }}
                />
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/5">
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
            {activityGrid.filter(d => d.count > 0).length} días activos de 90
          </span>
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
            Racha actual: {(() => {
              let streak = 0;
              for (let i = activityGrid.length - 1; i >= 0; i--) {
                if (activityGrid[i].count > 0) streak++;
                else break;
              }
              return streak;
            })()} días
          </span>
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

        {/* PRO SECTION 1: Tendencia de Peso */}
        <div className="glass rounded-3xl border border-white/5 overflow-hidden relative">
          <div className={`p-8 ${profile?.plan !== 'pro' ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Tendencia de Peso (30 días)</h2>
            <p className="text-text-secondary text-sm mb-8">Evolución de tu peso corporal con predicción de IA.</p>
            <div className="flex items-end justify-between gap-2 h-[200px]">
              {[78, 77.5, 77.8, 77.2, 76.9, 76.5, 76.8, 76.2, 75.9, 75.5, 75.8, 75.2, 74.9, 74.5].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className="w-full bg-primary/30 rounded-t-lg" style={{ height: `${((val - 73) / 6) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 bg-white/5 rounded-xl"><span className="text-xl font-bold text-white">-3.1 kg</span><br/><span className="text-xs text-text-muted">Cambio total</span></div>
              <div className="p-4 bg-white/5 rounded-xl"><span className="text-xl font-bold text-white">74.5 kg</span><br/><span className="text-xs text-text-muted">Peso actual</span></div>
              <div className="p-4 bg-white/5 rounded-xl"><span className="text-xl font-bold text-primary">72 kg</span><br/><span className="text-xs text-text-muted">Meta estimada</span></div>
            </div>
          </div>
          {/* PRO Overlay */}
          {profile?.plan !== 'pro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/40 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-yellow-400" />
              </div>
              <span className="text-sm font-black text-white mb-1">Tendencia de Peso</span>
              <span className="text-xs text-text-secondary mb-4">Seguimiento inteligente de tu peso con predicciones IA</span>
              <button className="h-10 px-6 rounded-xl bg-linear-to-r from-yellow-500 to-orange-500 text-background font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all">
                Desbloquear con PRO
              </button>
            </div>
          )}
        </div>

        {/* PRO SECTION 2: Análisis de Sueño IA */}
        <div className="glass rounded-3xl border border-white/5 overflow-hidden relative">
          <div className={`p-8 ${profile?.plan !== 'pro' ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Análisis de Sueño Inteligente</h2>
            <p className="text-text-secondary text-sm mb-6">Patrones de sueño analizados por inteligencia artificial.</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Moon, label: "Hora Óptima", val: "22:30 - 06:30" },
                { icon: TrendingUp, label: "Calidad Promedio", val: "8.2 / 10" },
                { icon: Heart, label: "Correlación Entreno", val: "+23% calidad" },
                { icon: Calendar, label: "Mejor Día", val: "Domingo" },
              ].map((item, i) => (
                <div key={i} className="p-5 bg-white/5 rounded-2xl border border-white/5">
                  <item.icon className="w-5 h-5 text-blue-400 mb-2" />
                  <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono block">{item.label}</span>
                  <span className="text-lg font-bold text-white">{item.val}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10">
              <p className="text-sm text-white"><span className="text-blue-400 font-bold">Insight IA:</span> Tu recuperación mejora un 23% los días que entrenas antes de las 18:00. Recomendación: mantén tus entrenos en horario matutino para optimizar el ciclo REM.</p>
            </div>
          </div>
          {/* PRO Overlay */}
          {profile?.plan !== 'pro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/40 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-yellow-400" />
              </div>
              <span className="text-sm font-black text-white mb-1">Análisis IA de Sueño</span>
              <span className="text-xs text-text-secondary mb-4">Insights avanzados sobre tus patrones de recuperación</span>
              <button className="h-10 px-6 rounded-xl bg-linear-to-r from-yellow-500 to-orange-500 text-background font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-105 active:scale-95 transition-all">
                Desbloquear con PRO
              </button>
            </div>
          )}
        </div>

        {/* PRO SECTION 3: Proyección de Progreso */}
        <div className="glass rounded-3xl border border-white/5 overflow-hidden relative">
          <div className={`p-8 ${profile?.plan !== 'pro' ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Proyección de Progreso (6 meses)</h2>
            <p className="text-text-secondary text-sm mb-8">Predicción basada en tu ritmo actual de entrenamiento.</p>
            <div className="flex items-end justify-between gap-1 h-[180px]">
              {[20, 28, 35, 42, 48, 55, 60, 65, 72, 78, 82, 85, 88, 90, 93, 95, 97, 98, 99, 100].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                  <div className={`w-full rounded-t-lg ${i < 8 ? 'bg-white/20' : 'bg-primary/30 border-t border-primary/50'}`} style={{ height: `${val}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-4 gap-4">
              <div className="p-3 bg-white/5 rounded-xl text-center"><span className="text-lg font-bold text-white">85%</span><br/><span className="text-[9px] text-text-muted">Fuerza</span></div>
              <div className="p-3 bg-white/5 rounded-xl text-center"><span className="text-lg font-bold text-primary">92%</span><br/><span className="text-[9px] text-text-muted">Resistencia</span></div>
              <div className="p-3 bg-white/5 rounded-xl text-center"><span className="text-lg font-bold text-white">78%</span><br/><span className="text-[9px] text-text-muted">Flexibilidad</span></div>
              <div className="p-3 bg-white/5 rounded-xl text-center"><span className="text-lg font-bold text-orange-400">88%</span><br/><span className="text-[9px] text-text-muted">Consistencia</span></div>
            </div>
          </div>
          {/* PRO Overlay */}
          {profile?.plan !== 'pro' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/40 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-4">
                <Lock className="w-7 h-7 text-yellow-400" />
              </div>
              <span className="text-sm font-black text-white mb-1">Proyección de Progreso</span>
              <span className="text-xs text-text-secondary mb-4">Ve dónde estarás en 6 meses según tu rendimiento actual</span>
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
