"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function MockupsScroll() {
  const containerRef = useRef<HTMLElement>(null);
  const mockupsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (!containerRef.current || mockupsRef.current.length === 0) return;

    gsap.fromTo(
      mockupsRef.current,
      { rotateX: 30, rotateY: 15, scale: 0.9, y: 100 },
      {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        y: 0,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "top 20%",
          scrub: 1,
        },
      }
    );
  }, []);

  return (
    <section 
      ref={containerRef} 
      className="py-32 w-full bg-[#111111] overflow-hidden flex flex-col items-center justify-center border-y border-white/5"
    >
      <div className="max-w-7xl mx-auto w-full px-6 flex flex-col items-center">
        <div className="text-center mb-16 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">El Centro de Observación</h2>
          <p className="text-text-secondary">Tres pilares de datos operando en perfecta sincronía bajo la óptica del sistema monolítico.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 perspective-[2000px] w-full justify-center">
          {/* Mockup 1: Gym */}
          <div 
            ref={(el) => { mockupsRef.current[0] = el; }}
            className="glass flex-1 min-w-[300px] h-[500px] bg-background flex flex-col p-6 border border-white/10"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="text-xs text-text-muted uppercase tracking-widest font-mono mb-4">Módulo de Fuerza</div>
            <div className="w-12 h-2 bg-white/20 rounded-full mb-8"></div>
            <div className="w-full h-16 bg-white/5 rounded-lg mb-4"></div>
            <div className="w-full h-16 bg-white/5 rounded-lg mb-4"></div>
            <div className="w-full h-16 bg-white/5 rounded-lg"></div>
          </div>
          
          {/* Mockup 2: Diet (Central focus) */}
          <div 
            ref={(el) => { mockupsRef.current[1] = el; }}
            className="glass flex-1 min-w-[300px] h-[550px] bg-background flex flex-col p-6 border border-white/10 relative -top-6"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="text-xs text-text-muted uppercase tracking-widest font-mono mb-4">Tus Macros</div>
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-8"></div>
            <div className="flex gap-2 w-full mb-8 mt-4">
              <div className="flex-1 h-32 bg-white/5 rounded-lg"></div>
              <div className="flex-1 h-32 bg-white/5 rounded-lg"></div>
            </div>
            <div className="w-full h-10 bg-white/10 rounded-lg"></div>
          </div>
          
          {/* Mockup 3: AI */}
          <div 
            ref={(el) => { mockupsRef.current[2] = el; }}
            className="glass flex-1 min-w-[300px] h-[500px] bg-background flex flex-col p-6 border border-white/10"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div className="text-xs text-text-muted uppercase tracking-widest font-mono mb-4">Agente Autónomo</div>
            <div className="flex-1 overflow-hidden flex flex-col justify-end gap-3 pb-4">
              <div className="w-3/4 h-12 bg-white/10 rounded-lg rounded-tl-none self-start"></div>
              <div className="w-1/2 h-12 bg-white/20 rounded-lg rounded-tr-none self-end"></div>
              <div className="w-4/5 h-16 glass rounded-lg rounded-tl-none self-start border-white/20"></div>
            </div>
            <div className="w-full h-12 bg-white/5 rounded-full mt-auto"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
