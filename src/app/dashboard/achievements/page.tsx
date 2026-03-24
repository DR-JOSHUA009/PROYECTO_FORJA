"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Award, Trophy, Star, Shield, Zap, Target, Flame, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon3D } from "@/components/ui/Icon3D";

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [userXP, setUserXP] = useState<any>(null);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const supabase = createClient();

  const achievementsArr = [
    { key: "perfil_creado", name: "Origen de Forja", desc: "Has completado tu perfil maestro.", xp: 50, icon: Target, color: "#ffffff" },
    { key: "primera_semana", name: "Atleta Iniciado", desc: "Primera semana completa en el SaaS.", xp: 200, icon: Flame, color: "#f97316" },
    { key: "primer_mes", name: "Constancia de Hierro", desc: "Un mes de entrenamiento diario.", xp: 500, icon: Shield, color: "#ffffff" },
    { key: "sueno_7_dias", name: "Recuperación Maestra", desc: "7 días con sueño óptimo.", xp: 200, icon: Zap, color: "#60a5fa" },
    { key: "agua_5_dias", name: "Hidratación Elite", desc: "Meta de agua cumplida por 5 días.", xp: 150, icon: Star, color: "#22d3ee" },
    { key: "rutina_modificada_ia", name: "Control Maestro", desc: "Has modificado tu plan con IA.", xp: 100, icon: Award, color: "#10b981" },
  ];

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: xpData } = await supabase.from("user_xp").select("*").eq("user_id", user.id).single();
      const { data: achData } = await supabase.from("achievements").select("achievement_key").eq("user_id", user.id);

      setUserXP(xpData || { total_xp: 0, level: 1 });
      setUnlocked(achData?.map(a => a.achievement_key) || ["perfil_creado"]); // Mocked for now if empty
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentLevel = userXP?.level || 1;
  const currentXP = userXP?.total_xp || 0;
  const nextLevelXP = currentLevel * 1000;
  const progressPercent = (currentXP % 1000) / 10;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Logros <Icon3D icon={Trophy} color="white" size={32} />
          </h1>
          <p className="text-text-secondary">Tu evolución registrada para la eternidad.</p>
        </div>
        
        <div className="glass p-6 rounded-3xl border border-white/5 bg-white/2 min-w-[300px] flex flex-col gap-4 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-3xl -z-10" />
           <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-mono leading-none mb-1">NIVEL ACTUAL</span>
                <span className="text-4xl font-black text-white italic">LVL {currentLevel}</span>
              </div>
              <span className="text-xs text-text-secondary font-mono font-bold">{currentXP} XP TOTAL</span>
           </div>
           
           <div className="flex flex-col gap-2">
             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1.5px]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
             </div>
             <div className="flex justify-between items-center text-[10px] font-mono text-text-muted tracking-widest uppercase">
                <span>0 XP</span>
                <span>{nextLevelXP} XP PARA EL SIGUIENTE</span>
             </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievementsArr.map((ach, i) => {
          const isUnlocked = unlocked.includes(ach.key);
          return (
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
               key={ach.key} 
               className={`glass p-8 rounded-3xl border flex flex-col items-center text-center transition-all ${isUnlocked ? 'border-white/10 bg-white/2 hover:border-white/20' : 'border-white/5 grayscale opacity-40 bg-transparent'}`}
            >
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
    </div>
  );
}
