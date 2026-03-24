"use client";

import { useState } from "react";
import gsap from "gsap";
import { Check } from "lucide-react";

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);

  const toggleBilling = () => {
    setIsAnnual(!isAnnual);
    const targetPrice = !isAnnual ? 99 : 15;
    const startPrice = !isAnnual ? 15 : 99;
    
    const priceObj = { value: startPrice };
    
    gsap.to(priceObj, {
      value: targetPrice,
      duration: 0.8,
      ease: "power3.out",
      onUpdate: () => {
        const el = document.getElementById("pro-price-num");
        if (el) el.innerHTML = Math.round(priceObj.value).toString();
      }
    });
  };

  return (
    <section className="py-32 px-6 w-full max-w-7xl mx-auto bg-background border-t border-white/5">
      <div className="text-center mb-16 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">Acceso al Sistema</h2>
        <p className="text-text-secondary mb-12">Elige el nivel computacional que tu maquinaria requiere.</p>

        {/* Toggle */}
        <div className="inline-flex items-center glass p-1 rounded-full cursor-pointer" onClick={toggleBilling}>
          <div className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${!isAnnual ? "bg-white text-background" : "text-text-secondary"}`}>
            Mensual
          </div>
          <div className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${isAnnual ? "bg-white text-background" : "text-text-secondary"}`}>
            Anual
            <span className="text-[10px] uppercase bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold ml-1">Ahorro 45%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* FREE CARD */}
        <div className="glass p-8 flex flex-col gap-6 relative overflow-hidden group">
          <div className="mb-2">
            <h3 className="text-2xl font-bold text-white mb-2">Base Fisiológica</h3>
            <p className="text-text-secondary text-sm h-10">Optimización pasiva. Rutina manual y seguimiento basal.</p>
          </div>
          <div className="flex items-end gap-2 mb-8">
            <span className="text-5xl font-bold text-white">$0</span>
            <span className="text-text-secondary mb-1">/ para siempre</span>
          </div>

          <ul className="flex flex-col gap-4 text-sm text-text-secondary mb-12 flex-1">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-white/50 shrink-0" /> Generación de Rutina Inicial
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-white/50 shrink-0" /> Tracking Diario (Gym + Peso)
            </li>
            <li className="flex items-start gap-3 opacity-30">
              <Check className="w-5 h-5 text-white/50 shrink-0" /> Modificaciones Biológicas IA (Bloqueado)
            </li>
            <li className="flex items-start gap-3 opacity-30">
              <Check className="w-5 h-5 text-white/50 shrink-0" /> Macros en Tiempo Real (Bloqueado)
            </li>
          </ul>

          <button className="w-full h-12 rounded-md border border-white/20 text-white font-medium hover:bg-white hover:text-background transition-colors">
            Crear Perfil Base
          </button>
        </div>

        {/* PRO CARD */}
        <div className="glass p-8 flex flex-col gap-6 relative overflow-hidden border-white/20 shadow-[0_0_80px_rgba(255,255,255,0.05)] transform md:-translate-y-4">
          <div className="absolute top-0 inset-x-0 h-1 bg-white"></div>
          
          <div className="mb-2 flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Agente Desatado</h3>
              <p className="text-text-secondary text-sm h-10">Nivel élite. El agente recalibra tus parámetros en vivo.</p>
            </div>
            <div className="px-3 py-1 bg-white/10 text-white text-[10px] uppercase tracking-widest rounded-full font-bold">
              Óptimo
            </div>
          </div>
          <div className="flex items-end gap-2 mb-8">
            <span className="text-5xl font-bold text-white flex">
              $<span id="pro-price-num">{isAnnual ? 99 : 15}</span>
            </span>
            <span className="text-text-secondary mb-1">/ {isAnnual ? "año" : "mes"}</span>
          </div>

          <ul className="flex flex-col gap-4 text-sm text-white mb-12 flex-1">
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-white shrink-0" /> <span className="font-bold">Chat Autónomo Ilimitado con LLM-70B</span>
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-white shrink-0" /> Re-estructuración de Rutina de Emergencia
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-white shrink-0" /> Tracking Macro-Nutricional Dinámico
            </li>
            <li className="flex items-start gap-3">
              <Check className="w-5 h-5 text-white shrink-0" /> Análisis de Patrones de Sueño
            </li>
          </ul>

          <button className="w-full h-12 rounded-md bg-white text-background font-bold hover:bg-white/90 transition-colors shadow-[0_4px_20px_rgba(255,255,255,0.2)]">
            Activar Acceso Total
          </button>
        </div>
      </div>
    </section>
  );
}
