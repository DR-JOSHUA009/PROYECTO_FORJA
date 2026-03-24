"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import Link from "next/link";
import { MoveRight } from "lucide-react"; // Using this as temporary fallback until we inject 3D models

export default function Hero() {
  const container = useRef<HTMLElement>(null);
  const headline = useRef<HTMLHeadingElement>(null);
  const subheadline = useRef<HTMLParagraphElement>(null);
  const btns = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !headline.current) return;

    // Split text logic manually for simple stagger (or just use opacity stagger on GSAP splitText if available)
    const chars = headline.current.querySelectorAll("span.char");

    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.fromTo(
      chars,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, stagger: 0.03, duration: 1, delay: 0.2 }
    )
    .fromTo(
      subheadline.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      "-=0.5"
    )
    .fromTo(
      btns.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      "-=0.6"
    );

  }, []);

  return (
    <section 
      ref={container}
      className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background px-6 pt-24 pb-12"
    >
      {/* Abstract subtle mouse geometry would go here - keeping it clean for now per specs */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5">
        <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.1" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="white" strokeWidth="0.1" />
        </svg>
      </div>

      <div className="z-10 max-w-4xl mx-auto flex flex-col items-center text-center space-y-8">
        <h1 
          ref={headline}
          className="text-white font-bold leading-[1.1] tracking-[-0.04em] text-6xl md:text-[80px] lg:text-[96px]"
        >
          {/* Breaking the text so we can animate it manually */}
          <span className="inline-block overflow-hidden"><span className="char inline-block">T</span><span className="char inline-block">u</span></span>{" "}
          <span className="inline-block overflow-hidden"><span className="char inline-block">c</span><span className="char inline-block">u</span><span className="char inline-block">e</span><span className="char inline-block">r</span><span className="char inline-block">p</span><span className="char inline-block">o</span><span className="char inline-block">.</span></span><br className="max-md:hidden"/>{" "}
          <span className="inline-block overflow-hidden"><span className="char inline-block text-[#8bdc00]">T</span><span className="char inline-block text-[#8bdc00]">u</span></span>{" "}
          <span className="inline-block overflow-hidden"><span className="char inline-block text-[#8bdc00]">I</span><span className="char inline-block text-[#8bdc00]">A</span><span className="char inline-block text-[#8bdc00]">.</span></span><br className="max-md:hidden"/>{" "}
          <span className="inline-block overflow-hidden"><span className="char inline-block">T</span><span className="char inline-block">u</span></span>{" "}
          <span className="inline-block overflow-hidden"><span className="char inline-block">r</span><span className="char inline-block">i</span><span className="char inline-block">t</span><span className="char inline-block">m</span><span className="char inline-block">o</span><span className="char inline-block">.</span></span>
        </h1>
        
        <p 
          ref={subheadline}
          className="text-[#707070] text-lg max-w-xl opacity-0"
        >
          El motor definitivo para tu optimización física. Un dashboard táctico y asimétrico, controlado por 
          inteligencia artificial adaptativa en tiempo real. Cero distracciones. Rendimiento puro.
        </p>

        <div ref={btns} className="flex flex-col sm:flex-row items-center gap-4 pt-4 opacity-0">
          <Link 
            href="/register" 
            className="group flex h-14 items-center gap-2 rounded-md bg-white px-8 text-sm font-medium text-[#1a1c1c] transition-opacity hover:opacity-90"
          >
            Empezar gratis
            <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <button 
            onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
            className="glass flex h-14 items-center justify-center px-8 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Ver cómo funciona
          </button>
        </div>
      </div>
    </section>
  );
}
