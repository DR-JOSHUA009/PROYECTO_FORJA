"use client";

import { motion } from "framer-motion";
import { Apple, Plus, Search, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DietModule() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dietPlans, setDietPlans] = useState<any[]>([]);

  useEffect(() => {
    async function loadDiet() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(pData);

      const { data: dData } = await supabase.from("diet_plans").select("*").eq("user_id", user.id);
      setDietPlans(dData || []);
      
      setLoading(false);
    }
    loadDiet();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Calculate generic macros based on weight
  const weight = profile?.weight_kg || 70;
  const intensityMult = profile?.intensity === "alta" ? 1.6 : profile?.intensity === "media" ? 1.4 : 1.2;
  const tdee = Math.round(weight * 22 * intensityMult); // Maintenance
  // Adjust based on goal
  let targetCals = tdee;
  if (profile?.goal === "cut") targetCals -= 500;
  if (profile?.goal === "bulk") targetCals += 300;

  const targetPro = Math.round(weight * 2.2);
  const targetFat = Math.round(weight * 0.8);
  const targetCarbs = Math.round((targetCals - (targetPro * 4 + targetFat * 9)) / 4);

  // Mock ingested values for visual UI (normally from food_logs)
  const ingestedCals = Math.round(targetCals * 0.82); 
  const ingestedPro = Math.round(targetPro * 0.9);
  const ingestedCarbs = Math.round(targetCarbs * 0.83);
  const ingestedFat = Math.round(targetFat * 0.8);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Nutrición <Apple className="text-emerald-400 w-6 h-6" />
          </h1>
          <p className="text-text-secondary">Fase nutricional actual: <span className="text-white font-mono uppercase tracking-widest text-xs">{profile?.goal || "Mantenimiento"}</span></p>
        </div>
        <button className="h-10 px-4 rounded-xl bg-white text-background flex items-center gap-2 text-sm font-bold shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-colors">
          <Plus className="w-4 h-4" /> Añadir Comida
        </button>
      </header>

      {/* MACRO SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-1 glass p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
          <Flame className="w-8 h-8 text-orange-400 mb-2 opacity-80" />
          <span className="text-3xl font-bold text-white tracking-tight">{ingestedCals}</span>
          <span className="text-xs text-text-muted uppercase tracking-widest mt-1">/ {targetCals} KCALS</span>
          <div className="w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden">
            <div className={`h-full bg-orange-400`} style={{ width: `${(ingestedCals / targetCals) * 100}%` }} />
          </div>
        </div>
        
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          {[
            { label: "Proteína", val: ingestedPro, max: targetPro, col: "bg-white", w: `${(ingestedPro/targetPro)*100}%` },
            { label: "Carbos", val: ingestedCarbs, max: targetCarbs, col: "bg-white/60", w: `${(ingestedCarbs/targetCarbs)*100}%` },
            { label: "Grasas", val: ingestedFat, max: targetFat, col: "bg-white/30", w: `${(ingestedFat/targetFat)*100}%` },
          ].map((macro, i) => (
             <div key={i} className="glass p-6 rounded-2xl border border-white/5 flex flex-col justify-center">
               <span className="text-xs text-text-secondary uppercase tracking-widest font-mono mb-2">{macro.label}</span>
               <div className="flex items-end gap-1 mb-4">
                 <span className="text-2xl font-bold text-white">{macro.val}</span>
                 <span className="text-sm text-text-muted mb-0.5">/ {macro.max}g</span>
               </div>
               <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-auto">
                 <motion.div initial={{ width: 0 }} animate={{ width: macro.w }} className={`h-full ${macro.col}`} />
               </div>
             </div>
          ))}
        </div>
      </div>

      {/* RECOMENDACIONES DEL DÍA / IA PLAN */}
      <h2 className="text-lg font-bold text-white mb-4">Plan Sugerido por IA</h2>
      
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Pídele a Forja adaptar uno de los platos a tus macros restantes..." className="w-full h-10 bg-background border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white outline-none focus:border-white transition-colors" />
          </div>
        </div>

        <div className="flex flex-col">
          {dietPlans.length > 0 ? dietPlans.map((meal, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (idx * 0.1) }}
              className="flex items-start justify-between p-6 border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex flex-col gap-2">
                <div className="text-xs text-primary font-mono font-bold">{meal.meal_type}</div>
                <div className="flex flex-col gap-1 mt-1">
                  {meal.foods?.map((food: any, fIdx: number) => (
                    <span key={fIdx} className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                      {food.name} <span className="text-text-secondary font-normal text-xs ml-1">({food.quantity})</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-xs font-mono text-white/50 group-hover:text-primary transition-colors border border-white/10 px-3 py-1 rounded-full uppercase">
                Registrar
              </div>
            </motion.div>
          )) : (
            <div className="flex flex-col items-center justify-center p-10 text-center text-text-secondary">
              <span className="mb-2 opacity-50"><Apple className="w-8 h-8"/></span>
              <span className="text-sm">No hay un plan generado. Haz el Onboarding o escríbele a la IA.</span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
