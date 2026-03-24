"use client";

import { motion } from "framer-motion";
import { Settings, Shield, Bell, CreditCard, ChevronRight } from "lucide-react";

export default function SettingsModule() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          Protocolos <Settings className="text-text-muted w-6 h-6" />
        </h1>
        <p className="text-text-secondary">Configuración del sistema y preferencias biométricas.</p>
      </header>

      <div className="flex flex-col gap-6">
        
        {/* SECTOR 1 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Identidad
            </h2>
          </div>
          <div className="p-2 flex flex-col">
             {[
               { name: "Correo Electrónico", val: "atletabeta@ejemplo.com" },
               { name: "Contraseña", val: "••••••••••••" },
               { name: "Autenticación Biométrica", val: "Inactiva" },
             ].map((set, i) => (
                <div key={i} className="flex justify-between items-center p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                  <span className="text-sm text-text-secondary">{set.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{set.val}</span>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                  </div>
                </div>
             ))}
          </div>
        </motion.div>

        {/* SECTOR 2 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-white" /> Suscripción
            </h2>
          </div>
          <div className="p-6 flex justify-between items-center">
             <div className="flex flex-col gap-1">
               <span className="text-lg font-bold text-white">Agente Desatado (Pro)</span>
               <span className="text-sm text-text-secondary">Renovación: 15 de Noviembre, 2026</span>
             </div>
             <button className="h-10 px-4 rounded-xl border border-white/20 text-white text-sm hover:bg-white hover:text-background transition-colors font-medium">
               Gestionar
             </button>
          </div>
        </motion.div>

        {/* SECTOR 3 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Bell className="w-4 h-4 text-white" /> Notificaciones del Agente
            </h2>
          </div>
          <div className="p-2 flex flex-col">
             {[
               { name: "Recordatorios de Entrenamiento", state: true },
               { name: "Avisos de Ingesta Proteica", state: true },
               { name: "Ajustes de Rutina Autónomos", state: true },
               { name: "Resumen Semanal de Progreso", state: false },
             ].map((set, i) => (
                <div key={i} className="flex justify-between items-center p-4 hover:bg-white/5 rounded-xl transition-colors">
                  <span className="text-sm text-text-secondary">{set.name}</span>
                  <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${set.state ? 'bg-primary' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${set.state ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
             ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
