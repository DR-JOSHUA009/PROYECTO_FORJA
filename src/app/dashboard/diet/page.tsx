"use client";

import { motion } from "framer-motion";
import { Apple, Plus, Search, Flame } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import WaterVessel from "@/components/dashboard/WaterVessel";
import { Droplet } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";

export default function DietModule() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dietPlans, setDietPlans] = useState<any[]>([]);

  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [waterToday, setWaterToday] = useState(0);
  const [isAddingWater, setIsAddingWater] = useState(false);

  const supabase = createClient();

  const loadDiet = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pData } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
    setProfile(pData);

    const { data: dData } = await supabase.from("diet_plans").select("*").eq("user_id", user.id);
    setDietPlans(dData || []);

    // Fetch today's food logs
    const { data: fData } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", new Date().toISOString().split('T')[0]);
    
    if (fData) {
      setTodayLogs(fData);
      setIngested({
        cals: fData.reduce((acc, log) => acc + (log.calories || 0), 0),
        pro: fData.reduce((acc, log) => acc + (log.protein || 0), 0),
        carbs: fData.reduce((acc, log) => acc + (log.carbs || 0), 0),
        fats: fData.reduce((acc, log) => acc + (log.fats || 0), 0),
      });
    }

    const { data: wData } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", user.id)
      .eq("date", new Date().toISOString().split('T')[0]);
    
    setWaterToday(wData?.reduce((acc, l) => acc + (l.amount_ml || 0), 0) || 0);
    
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDiet();
  }, [loadDiet]);

  // --- SUPABASE REALTIME: escuchar cambios en diet_plans ---
  useEffect(() => {
    let channel: any;

    async function setupRealtime() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('diet-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'diet_plans',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            toast("🍎 Tu plan de dieta se actualizó desde el agente IA", "info");
            loadDiet();
          }
        )
        .subscribe();
    }

    setupRealtime();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [supabase, loadDiet, toast]);

  const [ingested, setIngested] = useState({ cals: 0, pro: 0, carbs: 0, fats: 0 });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [foodQuery, setFoodQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("Desayuno");

  const handleAddFood = async () => {
    if (!foodQuery) return;
    setIsAnalyzing(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const res = await fetch("/api/food/analyze", {
        method: "POST",
        body: JSON.stringify({ food: foodQuery })
      });
      const nutrition = await res.json();
      
      if (nutrition && !nutrition.error) {
        await supabase.from("food_logs").insert({
          user_id: user?.id,
          food_name: nutrition.food_name,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fats: nutrition.fats,
          meal_type: selectedMeal, // Use selected meal
          date: new Date().toISOString().split('T')[0]
        });
        
        // Refresh ingested
        setIngested(prev => ({
          cals: prev.cals + nutrition.calories,
          pro: prev.pro + nutrition.protein,
          carbs: prev.carbs + nutrition.carbs,
          fats: prev.fats + nutrition.fats,
        }));
        setFoodQuery("");
        toast(`Añadido: ${nutrition.food_name} (${nutrition.calories} kcal)`, "success");
      }
    } catch (err) {
      toast("Error al analizar alimento", "error");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddWater = async (ml: number) => {
    setIsAddingWater(true);
    const supabase = createClient();
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        body: JSON.stringify({ amount_ml: ml })
      });
      if (res.ok) {
        setWaterToday(prev => prev + ml);
        toast(`💧 Registrados ${ml}ml. ¡Sigue así!`, "success");
      }
    } catch (err) {
      toast("Error al registrar agua", "error");
      console.error(err);
    } finally {
      setIsAddingWater(false);
    }
  };

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
  let fallbackCals = tdee;
  if (profile?.goal === "cut") fallbackCals -= 500;
  if (profile?.goal === "bulk") fallbackCals += 300;

  const targetCals = profile?.target_calories || fallbackCals;
  const targetPro = profile?.target_protein || Math.round(weight * 2.2);
  const targetFat = profile?.target_fat || Math.round(weight * 0.8);
  const targetCarbs = profile?.target_carbs || Math.round((targetCals - (targetPro * 4 + targetFat * 9)) / 4);

  const ingestedCals = Math.round(ingested.cals); 
  const ingestedPro = Math.round(ingested.pro);
  const ingestedCarbs = Math.round(ingested.carbs);
  const ingestedFat = Math.round(ingested.fats);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Nutrición <Icon3D icon={Apple} color="#10b981" size={28} />
          </h1>
          <p className="text-text-secondary">Fase nutricional actual: <span className="text-white font-mono uppercase tracking-widest text-xs">{profile?.goal || "Mantenimiento"}</span></p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
          <select 
            value={selectedMeal}
            onChange={e => setSelectedMeal(e.target.value)}
            className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-white transition-colors text-xs font-mono uppercase tracking-widest"
          >
            {["Desayuno", "Almuerzo", "Merienda", "Cena"].map(m => (
              <option key={m} value={m} className="bg-background">{m}</option>
            ))}
          </select>
          <div className="relative flex-1 md:flex-none">
            <input 
              type="text" 
              placeholder="Ej: 2 huevos y un café..." 
              value={foodQuery}
              onChange={e => setFoodQuery(e.target.value)}
              className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-white transition-colors text-sm min-w-[200px] w-full"
            />
          </div>
          <button 
            onClick={handleAddFood}
            disabled={isAnalyzing || !foodQuery}
            className="h-10 px-6 rounded-xl bg-white text-background flex items-center justify-center gap-2 text-sm font-bold shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? "..." : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MACRO SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-1 glass p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
          <Icon3D icon={Flame} color="#fb923c" size={32} className="mb-2" />
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

      {/* FOOD LOGS BY MEAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Alimentos Consumidos <span className="px-2 py-0.5 bg-white/5 rounded-lg text-[10px] text-text-muted border border-white/5">HOY</span>
          </h2>
          <div className="flex flex-col gap-3">
             {["Desayuno", "Almuerzo", "Merienda", "Cena"].map((mealType) => {
               const logs = todayLogs.filter(l => l.meal_type === mealType);
               return (
                 <div key={mealType} className="glass p-5 rounded-2xl border border-white/5 bg-white/2 hover:border-white/10 transition-all group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/80 transition-colors">{mealType}</span>
                      <span className="text-xs font-bold text-white/60">{Math.round(logs.reduce((acc, l) => acc + (l.calories || 0), 0))} kcal</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {logs.length > 0 ? logs.map((log, i) => (
                        <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                           <span className="text-sm text-white font-medium">{log.food_name}</span>
                           <span className="text-xs text-text-muted font-mono">{Math.round(log.calories)} kcal</span>
                        </div>
                      )) : (
                        <span className="text-[10px] text-text-muted uppercase tracking-widest text-center py-2 italic">Sin registros - añade arriba</span>
                      )}
                    </div>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white">Plan Sugerido (IA)</h2>
          <div className="glass rounded-2xl border border-white/5 overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" placeholder="Buscar en base de datos maestros..." className="w-full h-10 bg-background border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white outline-none focus:border-white transition-colors" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[600px] scrollbar-hide">
              {dietPlans.length > 0 ? dietPlans.map((meal, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (idx * 0.1) }}
                  className="flex items-start justify-between p-6 border-b border-white/5 hover:bg-white/5 transition-colors group"
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
                  <button 
                    onClick={async () => {
                       const supabase = createClient();
                       const { data: { user } } = await supabase.auth.getUser();
                       const mealLogs = meal.foods.map((f: any) => ({
                         user_id: user?.id,
                         food_name: f.name,
                         calories: f.calories || 0,
                         protein: f.protein_g || 0,
                         carbs: f.carbs_g || 0,
                         fats: f.fat_g || 0,
                         meal_type: meal.meal_type,
                         date: new Date().toISOString().split('T')[0]
                       }));
                       await supabase.from("food_logs").insert(mealLogs);
                       loadDiet();
                       toast(`¡Bien! ${meal.meal_type} registrado.`, "success");
                    }}
                    className="text-[10px] font-black uppercase tracking-widest text-white/50 group-hover:text-primary transition-colors border border-white/5 px-3 py-1.5 rounded-lg active:scale-95"
                  >
                    Registrar
                  </button>
                </motion.div>
              )) : (
                <div className="flex flex-col items-center justify-center p-20 text-center text-text-secondary">
                  <span className="mb-2 opacity-30"><Apple className="w-12 h-12"/></span>
                  <span className="text-sm font-mono tracking-widest uppercase text-xs">Sin planificación actual</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* WATER SECTION */}
      <div className="glass p-8 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center gap-10 mt-12 mb-12">
        <div className="flex flex-col gap-2 flex-1 text-center md:text-left">
          <h2 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
            Hidratación Diaria <Icon3D icon={Droplet} color="#60a5fa" size={22} />
          </h2>
          <p className="text-text-secondary text-sm max-w-md">
            Tu meta calculada es de <span className="text-white font-bold">{Math.round(weight * 35)}ml</span> diarios. Beber agua suficiente optimiza tu recuperación y quema calórica.
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-6">
            {[250, 500, 750].map(ml => (
              <button 
                key={ml}
                onClick={() => handleAddWater(ml)}
                disabled={isAddingWater}
                className="h-12 px-6 rounded-xl border border-white/10 text-white font-mono text-xs hover:border-white transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50"
              >
                +{ml}ml
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4 bg-white/2 p-6 rounded-3xl border border-white/5 shadow-2xl">
          <WaterVessel percentage={(waterToday / (weight * 35)) * 100} />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-mono mb-1">PROGRESO</span>
            <span className="text-xl font-bold text-white font-mono">{waterToday} <span className="text-text-muted text-sm">/ {Math.round(weight * 35)}ml</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
