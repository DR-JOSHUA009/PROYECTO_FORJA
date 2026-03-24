"use client";

import { motion } from "framer-motion";
import { Apple, Plus, Search, Flame } from "lucide-react";

export default function DietModule() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Bioquímica <Apple className="text-emerald-400 w-6 h-6" />
          </h1>
          <p className="text-text-secondary">Fase nutricional actual: <span className="text-white font-mono uppercase tracking-widest text-xs">Volumen Limpio</span></p>
        </div>
        <button className="h-10 px-4 rounded-xl bg-white text-background flex items-center gap-2 text-sm font-bold shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-colors">
          <Plus className="w-4 h-4" /> Agregar Ingesta
        </button>
      </header>

      {/* MACRO SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-1 glass p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
          <Flame className="w-8 h-8 text-orange-400 mb-2 opacity-80" />
          <span className="text-3xl font-bold text-white tracking-tight">2,450</span>
          <span className="text-xs text-text-muted uppercase tracking-widest mt-1">/ 3,000 KCALS</span>
          <div className="w-full h-1 bg-white/5 mt-4 rounded-full overflow-hidden">
            <div className="h-full bg-orange-400 w-[81%]" />
          </div>
        </div>
        
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          {[
            { label: "Proteína", val: "180", max: "200", col: "bg-white", w: "90%" },
            { label: "Carbos", val: "250", max: "300", col: "bg-white/60", w: "83%" },
            { label: "Grasas", val: "60", max: "75", col: "bg-white/30", w: "80%" },
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

      {/* TIMELINE DE COMIDAS */}
      <h2 className="text-lg font-bold text-white mb-4">Registro del Día</h2>
      
      <div className="glass rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input type="text" placeholder="Pídele al Agente registrar una comida o busca aquí..." className="w-full h-10 bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white outline-none focus:border-white transition-colors" />
          </div>
        </div>

        <div className="flex flex-col">
          {[
            { time: "08:30 AM", name: "Avena con Whey Protein y Arándanos", cals: 450, macros: "45 P / 50 C / 8 G" },
            { time: "01:15 PM", name: "Pechuga de Pollo con Arroz Blanco", cals: 650, macros: "60 P / 80 C / 10 G" },
            { time: "04:30 PM", name: "Batido Pre-Entreno", cals: 200, macros: "25 P / 20 C / 2 G" },
          ].map((meal, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + (idx * 0.1) }}
              className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="text-xs text-text-muted font-mono w-20">{meal.time}</div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{meal.name}</span>
                  <span className="text-xs text-text-secondary">{meal.macros}</span>
                </div>
              </div>
              <div className="text-sm font-mono text-white group-hover:text-primary transition-colors">
                {meal.cals} kcal
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
