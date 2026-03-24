"use client";

import { Box, Diamond, Activity, Zap, Shield, Cpu } from "lucide-react";

export default function Marquee() {
  const words = [
    { text: "Gym", icon: <Box className="w-5 h-5" /> },
    { text: "Dieta", icon: <Activity className="w-5 h-5" /> },
    { text: "Cardio", icon: <Zap className="w-5 h-5" /> },
    { text: "Sueño", icon: <Shield className="w-5 h-5" /> },
    { text: "IA", icon: <Cpu className="w-5 h-5" /> },
    { text: "Stats", icon: <Diamond className="w-5 h-5" /> },
    { text: "Logros", icon: <Box className="w-5 h-5" /> },
    { text: "Personalizable", icon: <Activity className="w-5 h-5" /> },
    { text: "Premium", icon: <Zap className="w-5 h-5" /> },
    { text: "Agente", icon: <Cpu className="w-5 h-5" /> },
    { text: "Rutinas", icon: <Shield className="w-5 h-5" /> },
  ];

  return (
    <div className="w-full overflow-hidden bg-background py-16 flex flex-col gap-8 opacity-70">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          display: flex;
          width: 200%;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee-reverse {
          display: flex;
          width: 200%;
          animation: marquee-reverse 35s linear infinite;
        }
        .animate-marquee:hover, .animate-marquee-reverse:hover {
          animation-play-state: paused;
        }
      `}} />
      
      {/* Row 1 - Left */}
      <div className="animate-marquee items-center border-y border-white/5 py-3">
        {[...words, ...words].map((item, i) => (
          <div key={i} className="flex items-center gap-6 px-6 shrink-0 text-white/50 hover:text-white transition-colors cursor-default">
            <span className="text-xl md:text-2xl font-bold uppercase tracking-wider">{item.text}</span>
            <div className="text-primary opacity-60">{item.icon}</div>
          </div>
        ))}
      </div>

      {/* Row 2 - Right */}
      <div className="animate-marquee-reverse items-center border-y border-white/5 py-3">
        {[...words.reverse(), ...words.reverse()].map((item, i) => (
          <div key={i} className="flex items-center gap-6 px-6 shrink-0 text-white/50 hover:text-white transition-colors cursor-default">
            <span className="text-xl md:text-2xl font-bold uppercase tracking-wider">{item.text}</span>
            <div className="text-primary opacity-60">{item.icon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
