"use client";

import { useEffect, useRef, useState } from "react";
import { UserCircle, Cpu, MessageSquare } from "lucide-react";

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLElement>(null);
  
  // Array de referencias para usar IntersectionObserver en nuestros "bloques invisibles"
  const stepRefs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  useEffect(() => {
    // El observer vigila qué bloque invisible (1, 2 o 3) está cruzando el centro de la pantalla
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            setActiveStep(index);
          }
        });
      },
      {
        root: null,
        rootMargin: "-25% 0px -25% 0px", // Vigila aproximadamente la mitad de la pantalla
        threshold: 0.1,
      }
    );

    stepRefs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  const stepsData = [
    {
      icon: <UserCircle className="w-10 h-10 text-white" strokeWidth={1.5} />,
      title: "1. Cuéntanos sobre ti",
      desc: "Define con precisión absoluta tus limitantes, equipamiento y objetivos primarios en el proceso de Onboarding.",
    },
    {
      icon: <Cpu className="w-10 h-10 text-primary" strokeWidth={1.5} />,
      title: "2. La IA diseña tu plan",
      desc: "Nuestro LLM generará la rutina inicial y la nutrición personalizada para potenciar tu progreso.",
    },
    {
      icon: <MessageSquare className="w-10 h-10 text-white" strokeWidth={1.5} />,
      title: "3. Modifícalo cuando quieras",
      desc: "Si tu equipo del gym está ocupado o prefieres otra comida, pídele al Agente que re-estructure el bloque en tiempo real.",
    },
  ];

  return (
    <section 
      ref={containerRef} 
      className="relative w-full bg-background border-y border-white/5"
    >
      {/* 
        EL CONTENEDOR STICKY 
        Se queda "pegado" a la pantalla mientras scrolleas sobre el contenedor padre.
      */}
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center px-6 pointer-events-none">
        
        <h2 className="absolute top-24 md:top-32 text-3xl font-bold tracking-tight text-white z-10 text-center">
          El Algoritmo Inteligente
        </h2>

        {/* 
          ZONA DE RENDERIZADO VISUAL 
          Aquí intercambiamos la opacidad basándonos puramente en el estado de React 
        */}
        <div className="relative w-full max-w-lg h-[400px] flex items-center justify-center">
          {stepsData.map((step, index) => (
            <div
              key={index}
              className={`absolute inset-0 flex flex-col items-center justify-center text-center gap-6 transition-all duration-700 ease-out transform ${
                activeStep === index ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
            >
              <div 
                className={`w-24 h-24 rounded-full glass flex items-center justify-center shadow-2xl bg-white/5 border ${
                  activeStep === 1 ? "border-primary/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]" : "border-white/10"
                }`}
              >
                {step.icon}
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-text-secondary text-base md:text-lg px-4">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* LÍNEA DE PROGRESO */}
        <div className="absolute left-8 md:left-24 top-[30%] bottom-[20%] w-[2px] bg-white/5 hidden md:block">
          <div 
            className="w-full bg-white transition-all duration-1000 ease-in-out shadow-[0_0_15px_rgba(255,255,255,0.6)]" 
            style={{ height: `${((activeStep + 1) / 3) * 100}%` }}
          />
        </div>

      </div>

      {/* 
        BLOQUES INVISIBLES DE SCROLL (SPACERS)
        Estos bloques son los que el usuario realmente está "scrolleando". 
        Cada uno mide la altura de una pantalla. Cuando pasan por el centro, actualizan el state.
      */}
      <div className="relative w-full z-10 pointer-events-none">
        {stepRefs.map((ref, index) => (
          <div 
            key={index} 
            ref={ref} 
            data-index={index} 
            className="h-screen w-full"
          />
        ))}
      </div>

    </section>
  );
}
