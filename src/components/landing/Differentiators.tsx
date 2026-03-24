"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Brain, Settings2, Activity, Diamond } from "lucide-react"; // Fallbacks for 3D icons

const differentiators = [
  {
    title: "IA en tiempo real",
    description: "Cada repetición, cada macro, cada noche de sueño alimenta a la IA que recalibra tu plan al instante.",
    icon: <Brain className="w-8 h-8 text-primary" strokeWidth={1.5} />,
  },
  {
    title: "100% Personalizable",
    description: "Tú tienes el control. Fuerza la rutina a modo 'solo peso corporal' o cambia tu dieta con un mensaje.",
    icon: <Settings2 className="w-8 h-8 text-primary" strokeWidth={1.5} />,
  },
  {
    title: "Seguimiento Integral",
    description: "Gym, dieta, cardio y sueño unificados. No más apps desconectadas. Un solo ecosistema élite.",
    icon: <Activity className="w-8 h-8 text-primary" strokeWidth={1.5} />,
  },
  {
    title: "Diseño Premium",
    description: "Cero distracciones visuales. Interfaz diseñada bajo la filosofía de precisión oscura y asimetría funcional.",
    icon: <Diamond className="w-8 h-8 text-primary" strokeWidth={1.5} />,
  },
];

export default function Differentiators() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (cardsRef.current.length > 0) {
      gsap.fromTo(
        cardsRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    }
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {differentiators.map((item, index) => (
          <div
            key={index}
            ref={(el) => { cardsRef.current[index] = el; }}
            className="glass p-8 flex flex-col gap-4 opacity-0"
          >
            <div className="bg-white/5 w-16 h-16 rounded-xl flex items-center justify-center border border-white/10">
              {item.icon}
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">{item.title}</h3>
            <p className="text-text-secondary text-base leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
