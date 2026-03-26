"use client";

import { motion } from "framer-motion";
import { Award, Trophy, Star, Shield, Zap, Target, Flame, Lock, Droplet, Moon, Dumbbell, Activity, Apple, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon3D } from "@/components/ui/Icon3D";
import { useToast } from "@/components/ui/Toast";
import { AchievementModal } from "@/components/ui/AchievementModal";

// Definición de logros con condiciones de desbloqueo
const ACHIEVEMENTS_DEF = [
  { key: "perfil_creado", name: "Origen de Forja", desc: "Has completado tu perfil maestro y el onboarding.", xp: 50, icon: Target, color: "#ffffff" },
  { key: "primer_entreno", name: "Primera Gota de Sudor", desc: "Completaste tu primer entrenamiento.", xp: 100, icon: Dumbbell, color: "#ffffff" },
  { key: "primera_semana", name: "Atleta Iniciado", desc: "7 días con al menos una actividad registrada.", xp: 200, icon: Flame, color: "#f97316" },
  { key: "cardio_5", name: "Motor Cardíaco", desc: "5 sesiones de cardio completadas.", xp: 150, icon: Activity, color: "#22d3ee" },
  { key: "agua_5_dias", name: "Hidratación Elite", desc: "Meta de agua cumplida por 5 días.", xp: 150, icon: Droplet, color: "#60a5fa" },
  { key: "sueno_7_dias", name: "Recuperación Maestra", desc: "7 registros de sueño con más de 7 horas.", xp: 200, icon: Moon, color: "#818cf8" },
  { key: "comidas_20", name: "Nutrición Disciplinada", desc: "20 alimentos registrados en el tracker.", xp: 150, icon: Apple, color: "#10b981" },
  { key: "rutina_modificada_ia", name: "Control Maestro", desc: "Has modificado tu plan con el agente IA.", xp: 100, icon: Bot, color: "#a78bfa" },
  { key: "nivel_5", name: "Evolución Constante", desc: "Alcanzaste el nivel 5.", xp: 300, icon: Zap, color: "#eab308" },
  { key: "primer_mes", name: "Constancia de Hierro", desc: "30 días activos en la plataforma.", xp: 500, icon: Shield, color: "#ffffff" },
  { key: "xp_5000", name: "Leyenda Forjada", desc: "Acumulaste 5,000 XP totales.", xp: 500, icon: Trophy, color: "#f59e0b" },
  { key: "cardio_20", name: "Maratonista", desc: "20 sesiones de cardio completadas.", xp: 300, icon: Star, color: "#ec4899" },
  { key: "racha_3", name: "Fuego Interior", desc: "3 días consecutivos con actividad registrada.", xp: 100, icon: Flame, color: "#f97316" },
  { key: "racha_7", name: "Semana Perfecta", desc: "7 días consecutivos de actividad sin fallar.", xp: 500, icon: Flame, color: "#ef4444" },
  { key: "racha_14", name: "Inquebrantable", desc: "14 días consecutivos de constancia absoluta.", xp: 1000, icon: Flame, color: "#dc2626" },
  { key: "racha_30", name: "Llama Eterna", desc: "30 días consecutivos de disciplina imparable.", xp: 2000, icon: Flame, color: "#b91c1c" },
];

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [modalQueue, setModalQueue] = useState<any[]>([]);
  const [modalAchievement, setModalAchievement] = useState<any>(null);
  const { toast } = useToast();
  const supabase = createClient();

  // Cuando la cola tiene elementos y no hay modal activo, muestra el siguiente
  useEffect(() => {
    if (modalQueue.length > 0 && !modalAchievement) {
      // Pequeño delay para que la animación de salida del anterior termine
      const timer = setTimeout(() => {
        setModalAchievement(modalQueue[0]);
        setModalQueue(prev => prev.slice(1));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalQueue, modalAchievement]);

  useEffect(() => {
    async function loadAndCheck() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load profile
      const { data: profileData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(profileData);

      // Load existing achievements
      const { data: achData } = await supabase.from("achievements").select("achievement_key").eq("user_id", user.id);
      const existingKeys = achData?.map(a => a.achievement_key) || [];

      // ===== AUTO-UNLOCK CHECK =====
      // Fetch all data needed for conditions
      const { data: workouts } = await supabase.from("workout_logs").select("created_at").eq("user_id", user.id);
      const { data: cardio } = await supabase.from("cardio_sessions").select("date").eq("user_id", user.id);
      const { data: sleepLogs } = await supabase.from("sleep_logs").select("hours_slept, date").eq("user_id", user.id);
      const { data: foodLogs } = await supabase.from("food_logs").select("date").eq("user_id", user.id);
      const { data: waterLogs } = await supabase.from("water_logs").select("date, amount_ml").eq("user_id", user.id);
      const { data: agentConvos } = await supabase.from("agent_conversations").select("tool_used, change_applied").eq("user_id", user.id);

      const weightKg = profileData?.weight_kg || 70;
      const waterGoal = weightKg * 35; // ml

      // Calculate unique active days (any activity)
      const activeDays = new Set<string>();
      workouts?.forEach(w => { if (w.created_at) activeDays.add(w.created_at.split('T')[0]); });
      cardio?.forEach(c => { if (c.date) activeDays.add(c.date); });
      sleepLogs?.forEach(s => { if (s.date) activeDays.add(s.date); });
      foodLogs?.forEach(f => { if (f.date) activeDays.add(f.date); });
      waterLogs?.forEach(w => { if (w.date) activeDays.add(w.date); });

      // Water days met
      const waterByDay: Record<string, number> = {};
      waterLogs?.forEach(w => {
        if (w.date) {
          waterByDay[w.date] = (waterByDay[w.date] || 0) + (w.amount_ml || 0);
        }
      });
      const waterDaysMet = Object.values(waterByDay).filter(ml => ml >= waterGoal).length;

      // Sleep days >= 7h
      const goodSleepDays = sleepLogs?.filter(s => Number(s.hours_slept) >= 7).length || 0;

      // Agent changes applied
      const agentChanges = agentConvos?.filter(a => a.change_applied).length || 0;
      // Also check if any routine was modified via confirmations (tool_used)
      const hasAgentMod = (agentConvos?.some(a => a.tool_used) || agentChanges > 0);

      // Calculate current streak
      const allDatesSet = new Set<string>();
      workouts?.forEach(w => { if (w.created_at) allDatesSet.add(w.created_at.split('T')[0]); });
      cardio?.forEach(c => { if (c.date) allDatesSet.add(c.date); });
      sleepLogs?.forEach(s => { if (s.date) allDatesSet.add(s.date); });
      foodLogs?.forEach(f => { if (f.date) allDatesSet.add(f.date); });
      waterLogs?.forEach(w => { if (w.date) allDatesSet.add(w.date); });

      let currentStreak = 0;
      for (let i = 0; i < 90; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        if (allDatesSet.has(dStr)) {
          currentStreak++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }

      // Define conditions
      const conditions: Record<string, boolean> = {
        perfil_creado: profileData?.onboarding_completed === true,
        primer_entreno: (workouts?.length || 0) >= 1,
        primera_semana: activeDays.size >= 7,
        cardio_5: (cardio?.length || 0) >= 5,
        agua_5_dias: waterDaysMet >= 5,
        sueno_7_dias: goodSleepDays >= 7,
        comidas_20: (foodLogs?.length || 0) >= 20,
        rutina_modificada_ia: hasAgentMod,
        nivel_5: (profileData?.level || 1) >= 5,
        primer_mes: activeDays.size >= 30,
        xp_5000: (profileData?.xp || 0) >= 5000,
        cardio_20: (cardio?.length || 0) >= 20,
        racha_3: currentStreak >= 3,
        racha_7: currentStreak >= 7,
        racha_14: currentStreak >= 14,
        racha_30: currentStreak >= 30,
      };

      // Unlock new achievements
      const toUnlock: string[] = [];
      for (const [key, met] of Object.entries(conditions)) {
        if (met && !existingKeys.includes(key)) {
          toUnlock.push(key);
        }
      }

      if (toUnlock.length > 0) {
        const inserts = toUnlock.map(key => ({ user_id: user.id, achievement_key: key }));
        await supabase.from("achievements").insert(inserts);

        // Award XP for newly unlocked
        let bonusXp = 0;
        toUnlock.forEach(key => {
          const def = ACHIEVEMENTS_DEF.find(a => a.key === key);
          if (def) bonusXp += def.xp;
        });

        if (bonusXp > 0) {
          const newXp = (profileData?.xp || 0) + bonusXp;
          await supabase.from("users_profile").update({ xp: newXp, level: Math.floor(newXp / 1000) + 1 }).eq("user_id", user.id);
          // Refresh profile
          const { data: updatedProfile } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
          setProfile(updatedProfile);
        }

        setNewlyUnlocked(toUnlock);

        // Construir la cola del modal con los datos completos de cada logro
        const queueItems = toUnlock
          .map(k => ACHIEVEMENTS_DEF.find(a => a.key === k))
          .filter(Boolean);
        setModalQueue(queueItems);
      }

      setUnlocked([...existingKeys, ...toUnlock]);
      setLoading(false);
    }
    loadAndCheck();
  }, [supabase, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentLevel = profile?.level || 1;
  const currentXP = profile?.xp || 0;
  const nextLevelXP = currentLevel * 1000;
  const progressPercent = (currentXP % 1000) / 10;
  const unlockedCount = unlocked.length;
  const totalCount = ACHIEVEMENTS_DEF.length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Logros <Icon3D icon={Trophy} color="white" size={32} />
          </h1>
          <p className="text-text-secondary">
            {unlockedCount} de {totalCount} desbloqueados • Tu evolución registrada para la eternidad.
          </p>
        </div>
        
        <div className="glass p-6 rounded-3xl border border-white/5 bg-white/2 min-w-[300px] flex flex-col gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-3xl -z-10" />
           <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono leading-none mb-1">NIVEL ACTUAL</span>
                <span className="text-4xl font-black text-white italic">LVL {currentLevel}</span>
              </div>
              <span className="text-xs text-text-secondary font-mono font-bold">{currentXP} XP TOTAL</span>
           </div>
           
           <div className="flex flex-col gap-2">
             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1.5px]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
             </div>
             <div className="flex justify-between items-center text-[10px] font-mono text-text-muted tracking-widest uppercase">
                <span>{currentXP % 1000} XP</span>
                <span>{nextLevelXP} XP PARA LVL {currentLevel + 1}</span>
             </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACHIEVEMENTS_DEF.map((ach, i) => {
          const isUnlocked = unlocked.includes(ach.key);
          const isNew = newlyUnlocked.includes(ach.key);
          return (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
               key={ach.key} 
               className={`glass p-8 rounded-3xl border flex flex-col items-center text-center transition-all relative overflow-hidden ${
                 isUnlocked 
                   ? 'border-white/10 bg-white/2 hover:border-white/20' 
                   : 'border-white/5 grayscale opacity-40 bg-transparent'
               } ${isNew ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
            >
              {isNew && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute top-3 right-3 px-2 py-0.5 bg-primary text-background text-[9px] font-black rounded-full uppercase tracking-widest"
                >
                  ¡Nuevo!
                </motion.div>
              )}

              <div className="relative mb-6">
                 {isUnlocked ? (
                   <Icon3D icon={ach.icon} color={ach.color} size={64} className="hover:scale-110 transition-transform" />
                 ) : (
                   <div className="w-[64px] h-[64px] flex items-center justify-center bg-white/5 rounded-full border border-white/5">
                      <Lock className="w-8 h-8 text-white/20" />
                   </div>
                 )}
                 {isUnlocked && <div className="absolute -inset-4 bg-white/5 rounded-full blur-2xl -z-10" />}
              </div>
              
              <h3 className="text-lg font-bold text-white mb-2 leading-tight">{ach.name}</h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-6">{ach.desc}</p>
              
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${isUnlocked ? 'border-primary/20 bg-primary/5 text-primary' : 'border-white/5 text-white/20'}`}>
                 {ach.xp} XP {isUnlocked ? "GANADO" : "PENDIENTE"}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AchievementModal 
        achievement={modalAchievement} 
        onClose={() => setModalAchievement(null)} 
      />
    </div>
  );
}
