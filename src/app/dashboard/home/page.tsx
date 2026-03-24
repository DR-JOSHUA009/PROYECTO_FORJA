"use client";

import { motion } from "framer-motion";
import { Activity, Flame, UtilityPole, CheckCircle2 } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Panel Operativo</h1>
        <p className="text-text-secondary">Estatus biológico general del Atleta Beta.</p>
      </header>

      {/* KPI WIDGETS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Flame, title: "Calorías Activas", value: "2,450", sub: "/ 3,000 kcals", col: "text-orange-400 border-orange-400/20" },
          { icon: UtilityPole, title: "Carga de Fuerza", value: "14,500", sub: "Libras movidas", col: "text-white border-white/20" },
          { icon: Activity, title: "Recuperación", value: "85%", sub: "Óptimo para hipertrofia", col: "text-primary border-primary/20" },
          { icon: CheckCircle2, title: "Cumplimiento", value: "92%", sub: "Eficiencia Semanal", col: "text-emerald-400 border-emerald-400/20" },
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
                <span className="text-3xl font-bold text-white">{widget.value}</span>
                <span className="text-xs text-text-muted mt-1">{widget.sub}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* RUTINA DEL DÍA */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(9,250,211,0.6)] animate-pulse" />
            Asignación Actual (Día PUSH)
          </h2>
          <div className="glass p-6 rounded-2xl border border-white/5 h-full">
            <div className="flex flex-col gap-4">
              {[
                { name: "Press de Banca Inclinado", series: "4 x 8-10", param: "RIR 1", status: "completed" },
                { name: "Press de Hombros DB", series: "3 x 10-12", param: "RIR 1-2", status: "pending" },
                { name: "Elevaciones Laterales Cable", series: "4 x 15", param: "Fallo", status: "pending" },
                { name: "Extensión Tríceps Cuerda", series: "3 x 12-15", param: "RIR 0", status: "pending" },
              ].map((ej, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors cursor-pointer">
                  <div className="flex flex-col">
                    <span className={`font-bold text-sm ${ej.status === 'completed' ? 'text-text-muted line-through' : 'text-white'}`}>{ej.name}</span>
                    <span className="text-xs text-text-secondary mt-1 tracking-wider uppercase">{ej.series} • <span className="text-primary/70 font-mono">{ej.param}</span></span>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${ej.status === 'completed' ? 'border-primary bg-primary/20 text-primary' : 'border-white/20'}`}>
                    {ej.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 h-12 bg-white text-background font-bold rounded-xl hover:bg-white/90 transition-colors shadow-[0_4px_20px_rgba(255,255,255,0.15)]">
              Iniciar Bloque de Entrenamiento
            </button>
          </div>
        </div>

        {/* BIOQUÍMICA (MACROS RADIAL) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white opacity-0 select-none">Progreso</h2>
          <div className="glass p-8 rounded-2xl border border-white/5 h-full flex flex-col items-center justify-center text-center">
            
            <div className="relative w-48 h-48 mb-8">
              {/* Circular Progress SVG */}
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <motion.circle 
                  cx="96" cy="96" r="88" fill="none" stroke="#fff" strokeWidth="12" 
                  strokeDasharray="552.92" // 2 * pi * 88
                  initial={{ strokeDashoffset: 552.92 }}
                  animate={{ strokeDashoffset: 552.92 - (552.92 * 0.85) }} // 85% full
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tighter text-white">2,450</span>
                <span className="text-[10px] text-text-secondary uppercase tracking-widest mt-1">Ingeridas</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Proteína</span>
                <span className="text-white font-bold">180g <span className="text-text-muted font-normal">/ 200g</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '90%' }} className="h-full bg-white" />
              </div>

              <div className="flex justify-between text-sm mt-2">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Carbos</span>
                <span className="text-white font-bold">250g <span className="text-text-muted font-normal">/ 300g</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '83%' }} className="h-full bg-white/60" />
              </div>

              <div className="flex justify-between text-sm mt-2">
                <span className="text-text-secondary font-mono tracking-widest uppercase text-xs">Grasas</span>
                <span className="text-white font-bold">60g <span className="text-text-muted font-normal">/ 75g</span></span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '80%' }} className="h-full bg-white/30" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
