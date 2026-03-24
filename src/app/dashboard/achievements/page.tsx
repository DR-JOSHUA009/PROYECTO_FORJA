"use client";

import { motion } from "framer-motion";
import { Shield, Sparkles, Trophy, Star, Medal, Lock, Gamepad2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ACHIEVEMENTS_DB = [
  { key: "perfil_creado", name: "Génesis", desc: "El origen de tu leyenda. Perfil configurado y metas calculadas.", xp: 50, icon: Star, color: "text-yellow-400" },
  { key: "primera_semana", name: "Inquebrantable", desc: "Soporta 7 días de carga metabólica sin romper adherencia.", xp: 200, icon: Shield, color: "text-orange-500" },
  { key: "cien_flexiones", name: "Centurión", desc: "Acumula 100 flexiones en tu bitácora de entrenamiento.", xp: 150, icon: DumbbellIcon, color: "text-zinc-200" },
  { key: "sueno_7_dias", name: "Sueño Rem", desc: "Asimilación celular óptica: 7 noches de más de 7 horas.", xp: 200, icon: MoonIcon, color: "text-blue-400" },
  { key: "agua_5_dias", name: "Aqua Pura", desc: "Hidratación máxima 5 días consecutivos.", xp: 150, icon: DropletIcon, color: "text-cyan-400" },
  { key: "agente_uso", name: "Mente Maestra", desc: "Descifraste la matriz interactuando con FORJA IA.", xp: 50, icon: Sparkles, color: "text-purple-400" },
  { key: "nivel_5", name: "Super Humano", desc: "Alcanza el nivel 5 de maestría. Eres el 5% superior.", xp: 300, icon: Trophy, color: "text-yellow-300" }
];

function DropletIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>; }
function MoonIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>; }
function DumbbellIcon(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.4 14.4l-4.8-4.8m-2.4-2.4l4.8 4.8m-7.2-2.4l7.2 7.2m-7.2-7.2l-2.4 2.4a2.83 2.83 0 1 0 4 4l2.4-2.4m4.8-4.8l2.4-2.4a2.83 2.83 0 1 0-4-4l-2.4 2.4"/></svg>; }

export default function AchievementsModule() {
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState<any[]>([]);
  const [userXp, setUserXp] = useState({ total_xp: 0, level: 1 });

  useEffect(() => {
    async function fetchAchievements() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: xpData } = await supabase.from("user_xp").select("*").eq("user_id", user.id).single();
      const { data: achData } = await supabase.from("achievements").select("*").eq("user_id", user.id);

      // Si no existe XP data, insertamos el primero nivel 1 con 0 XP (se asume que onboarding lo hace, pero por robustez visual en el demo)
      setUserXp(xpData || { total_xp: Math.floor(Math.random() * 800), level: 2 });
      
      // Mapear qué llaves están desbloqueadas
      const keys = achData ? achData.map(a => a.achievement_key) : [];
      setUnlocked(keys);
      setLoading(false);
    }
    fetchAchievements();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Lógica XP Niveles mock: Nivel 1=0, 2=200, 3=500, 4=1000
  const lvlThresholds = [0, 200, 500, 1000, 2000, 3500, 5500];
  const nextLvlXp = lvlThresholds[userXp.level] || lvlThresholds[lvlThresholds.length - 1];
  const currentLvlBaseXp = lvlThresholds[userXp.level - 1] || 0;
  
  const xpNeeded = nextLvlXp - currentLvlBaseXp;
  const xpGained = userXp.total_xp - currentLvlBaseXp;
  const progressPct = Math.min((xpGained / xpNeeded) * 100, 100);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex flex-col items-center justify-center text-center">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          Logros <Gamepad2 className="text-yellow-400 w-6 h-6" />
        </h1>
        <p className="text-text-secondary">Tu sendero de progresión y experiencia acumulada.</p>
        
        {/* PROGRESS BAR HEADER */}
        <div className="w-full max-w-2xl mt-10 glass p-8 rounded-2xl border-t border-t-white/10 relative overflow-hidden flex flex-col items-center border-[rgba(255,255,255,0.05)] text-center">
           <Medal className="w-16 h-16 text-primary mb-4" />
           <span className="text-lg font-bold text-white uppercase tracking-widest font-mono">Nivel {userXp.level}</span>
           <span className="text-sm text-text-muted mt-1 font-medium">{userXp.total_xp} XP Total</span>
           
           <div className="w-full h-2 bg-background border border-white/5 rounded-full mt-6 mb-2 overflow-hidden relative">
             <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ type: "spring", damping: 20 }} className="h-full bg-primary" />
           </div>
           
           <div className="w-full flex justify-between text-[10px] uppercase font-mono tracking-widest text-text-secondary">
             <span>Nivel {userXp.level}</span>
             <span>Faltan {nextLvlXp - userXp.total_xp} XP para Nivel {userXp.level + 1}</span>
             <span>Nivel {userXp.level + 1}</span>
           </div>
        </div>
      </header>

      {/* GRID DE LOGROS */}
      <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-widest text-xs font-mono ml-2 text-center md:text-left">Insignias de Honor</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ACHIEVEMENTS_DB.map((ach, i) => {
          const isUnlocked = unlocked.includes(ach.key);
          const Icon = ach.icon;

          // Mock un par para que se vea cómo queda
          const demoUnlocked = isUnlocked || (i === 0 || i === 5);

          return (
            <motion.div 
              key={ach.key}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className={`glass p-6 rounded-2xl border flex items-start gap-4 transition-all duration-300 ${demoUnlocked ? 'border-white/10 hover:border-white/30 hover:shadow-[0_4px_30px_rgba(255,255,255,0.05)]' : 'border-white/5 opacity-40 grayscale blur-[1px]'}`}
            >
              <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border shadow-xl ${demoUnlocked ? 'border-white/10 bg-white/5' : 'border-white/5 bg-background'}`}>
                {demoUnlocked ? <Icon className={`w-7 h-7 ${ach.color} drop-shadow-[0_0_10px_currentColor]`} /> : <Lock className="w-5 h-5 text-zinc-500" />}
              </div>
              
              <div className="flex flex-col flex-1">
                <span className={`text-xs font-mono tracking-widest font-bold uppercase mb-1 ${demoUnlocked ? ach.color : 'text-zinc-500'}`}>{demoUnlocked ? <>{ach.xp} XP</> : 'Bloqueado'}</span>
                <span className="text-white font-bold leading-tight mb-1 text-[15px]">{ach.name}</span>
                <span className="text-xs text-text-secondary leading-relaxed font-medium">{ach.desc}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
