"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Star, Quote } from "lucide-react";

// Agregamos 6 reseñas para que el grid 3x2 quede perfectamente simétrico y lleno
const REVIEWS = [
  {
    name: "A. Müller",
    role: "Atleta Táctico",
    text: "El agente reconstruyó mi rutina de espalda en 5 segundos cuando todas las poleas estaban ocupadas. Ninguna otra plataforma hace esto.",
    rating: 5,
  },
  {
    name: "J. Vargas",
    role: "Software Engineer",
    text: "La interfaz oscura y sin distracciones es perfecta. Finalmente un SaaS fitness que no parece un carnaval de colores fosforescentes.",
    rating: 5,
  },
  {
    name: "S. Rossi",
    role: "Powerlifter",
    text: "Poder ajustar macros con un solo comando de texto cambió mi vida. Literalmente le digo al chat qué comí y él actualiza el dashboard.",
    rating: 5,
  },
  {
    name: "D. Kim",
    role: "Triatleta",
    text: "Integrar el rendimiento cardiovascular con la recuperación muscular desde una misma consola central es vital. Precisión total.",
    rating: 5,
  },
  {
    name: "L. Becker",
    role: "Entrenador Híbrido",
    text: "He probado docenas de apps. Forja es la única que verdaderamente entiende la periodización ondulante cuando hablas con su IA.",
    rating: 5,
  },
  {
    name: "M. Chen",
    role: "Boxeador Amateur",
    text: "El sistema calculó perfectamente mis macros para el recorte de peso. No perdí fuerza en el proceso. Es como tener un bio-hacker personal.",
    rating: 5,
  },
];

export default function Reviews() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (cardsRef.current.length > 0) {
      // Animación de entrada con un rebote sutil y efecto de profundidad
      gsap.fromTo(
        cardsRef.current,
        { 
          opacity: 0, 
          y: 60, 
          scale: 0.95,
          rotateX: -10 
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: "expo.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
          },
        }
      );
    }
    
    // Animación continua y sutil de flotación para darle vida a la sección
    cardsRef.current.forEach((card, i) => {
      if (card) {
        gsap.to(card, {
          y: "-=8",
          duration: 2 + Math.random(), // Tiempo aleatorio para que no floten igual
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: Math.random() * 2 // Desfase aleatorio
        });
      }
    });

  }, []);

  return (
    <section ref={sectionRef} className="py-32 px-6 w-full max-w-7xl mx-auto overflow-hidden">
      <div className="text-center mb-20 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">El Veredicto Empírico</h2>
        <p className="text-text-secondary">Datos y testimonios de quienes ya delegaron su optimización al sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REVIEWS.map((review, i) => (
          <div 
            key={i} 
            ref={(el) => { cardsRef.current[i] = el; }}
            className="group glass p-8 rounded-2xl border border-white/5 opacity-0 flex flex-col justify-between h-full hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] cursor-default relative overflow-hidden"
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
          >
            {/* Brillo dinámico sutil en Hover */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-white fill-white" />
                  ))}
                </div>
                <Quote className="w-6 h-6 text-white/10" />
              </div>
              
              <p className="text-text-primary text-[15px] leading-relaxed mb-8 font-light tracking-wide">&quot;{review.text}&quot;</p>
            </div>

            <div className="flex items-center gap-4 relative z-10 mt-auto pt-6 border-t border-white/5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white font-mono text-sm tracking-tighter shadow-inner">
                {review.name.split('.')[0]}
              </div>
              <div>
                <div className="text-sm font-bold text-white tracking-tight">{review.name}</div>
                <div className="text-[10px] text-text-secondary uppercase tracking-widest">{review.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
