"use client";

import { motion } from "framer-motion";
import { Dumbbell, Plus, Timer, History, Save } from "lucide-react";

export default function GymModule() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Entrenamiento <Dumbbell className="text-primary w-6 h-6" />
          </h1>
          <p className="text-text-secondary">Bloque de hipertrofia activo: <span className="text-white font-mono uppercase tracking-widest text-xs">Día 3 - PUSH pesado</span></p>
        </div>
        <div className="flex gap-2">
          <button className="h-10 px-4 rounded-xl glass border border-white/10 hover:border-white/30 text-white flex items-center gap-2 text-sm font-medium transition-colors">
            <History className="w-4 h-4" /> Historial
          </button>
          <button className="h-10 px-4 rounded-xl bg-white text-background flex items-center gap-2 text-sm font-bold shadow-[0_4px_15px_rgba(255,255,255,0.2)] hover:bg-white/90 transition-colors">
            <Plus className="w-4 h-4" /> Modificar Bloque
          </button>
        </div>
      </header>

      {/* RUTINA DEL DÍA - TRACKER INTERACTIVO */}
      <div className="flex flex-col gap-6">
        {[
          { name: "Press de Banca Inclinado (Barra)", targets: [{ rep: 8, weight: "225", rir: 1 }, { rep: 8, weight: "225", rir: 1 }, { rep: 7, weight: "225", rir: 0 }] },
          { name: "Press Militar Sentado (Mancuernas)", targets: [{ rep: 10, weight: "80", rir: 1 }, { rep: 9, weight: "80", rir: 0 }] },
          { name: "Elevaciones Laterales en Polea", targets: [{ rep: 15, weight: "30", rir: 0 }, { rep: 15, weight: "30", rir: 0 }, { rep: 14, weight: "30", rir: 0 }] },
        ].map((exercise, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4"
          >
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">{idx + 1}. {exercise.name}</h2>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <Timer className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-5 gap-2 text-[10px] text-text-muted uppercase tracking-widest font-mono pl-4">
                <span>Serie</span>
                <span>Objetivo</span>
                <span>Libras</span>
                <span>Reps (Hechas)</span>
                <span>RIR</span>
              </div>
              
              {exercise.targets.map((set, sIdx) => (
                <div key={sIdx} className="grid grid-cols-5 gap-2 items-center bg-[#0a0a0a] border border-white/5 p-2 px-4 rounded-xl">
                  <span className="text-white font-bold">{sIdx + 1}</span>
                  <span className="text-text-secondary text-sm">{set.rep} reps</span>
                  <input type="number" defaultValue={set.weight} className="w-16 h-10 bg-transparent text-white font-mono text-center border-b border-white/10 focus:border-white outline-none" />
                  <input type="number" placeholder={`${set.rep}`} className="w-16 h-10 bg-white/5 rounded-lg text-white font-mono text-center border border-transparent focus:border-white/50 outline-none" />
                  <select className="w-16 h-10 bg-transparent text-white font-mono text-center border-none outline-none appearance-none cursor-pointer hover:bg-white/5 rounded">
                    <option className="bg-[#111]" value="0">0</option>
                    <option className="bg-[#111]" value="1" selected={set.rir === 1}>1</option>
                    <option className="bg-[#111]" value="2">2</option>
                    <option className="bg-[#111]" value="3">3</option>
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <button className="h-14 px-8 rounded-xl bg-primary text-background flex items-center gap-2 text-sm font-bold shadow-[0_0_20px_rgba(9,250,211,0.2)] hover:scale-105 active:scale-95 transition-all">
          <Save className="w-5 h-5" /> Registrar Entrenamiento
        </button>
      </div>

    </div>
  );
}
