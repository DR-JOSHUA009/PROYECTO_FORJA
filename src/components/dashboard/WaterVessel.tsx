"use client";

import { motion } from "framer-motion";

interface WaterVesselProps {
  percentage: number; // 0 to 100
}

export default function WaterVessel({ percentage }: WaterVesselProps) {
  // Clamp percentage between 0 and 100
  const fillLevel = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="relative w-32 h-44 flex items-center justify-center">
      {/* The Vessel Outline */}
      <div className="absolute inset-0 border-2 border-white/20 rounded-b-[40px] rounded-t-lg overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.05)]">
        
        {/* The Liquid Container */}
        <motion.div 
          className="absolute bottom-0 left-0 w-full bg-primary/80 shadow-[0_0_30px_rgba(9,250,211,0.4)]"
          initial={{ height: "0%" }}
          animate={{ height: `${fillLevel}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Animated Waves Surface */}
          <div className="absolute -top-4 left-0 w-[200%] h-4 overflow-hidden pointer-events-none">
            <motion.div 
              className="w-full h-full flex"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            >
              {[1, 2, 3, 4].map((_, i) => (
                <svg key={i} className="w-1/2 h-full fill-primary/80" viewBox="0 0 100 20" preserveAspectRatio="none">
                  <path d="M0 20 V10 Q25 0 50 10 T100 10 V20 H0 Z" />
                </svg>
              ))}
            </motion.div>
          </div>

          {/* Sparkles / Bubbles in the water */}
          <div className="absolute inset-0 opacity-30">
            {[1, 2, 3].map((b) => (
              <motion.div 
                key={b}
                className="absolute w-1 h-1 bg-white rounded-full"
                initial={{ bottom: -10, left: `${Math.random() * 80 + 10}%` }}
                animate={{ bottom: "100%", opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 2 + b, delay: b }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Glass Reflections */}
      <div className="absolute top-4 left-4 w-2 h-24 bg-white/5 rounded-full blur-[2px]" />
      <div className="absolute top-4 right-6 w-1 h-12 bg-white/10 rounded-full blur-[1px]" />
      
      {/* Measurement Lines */}
      <div className="absolute inset-0 flex flex-col justify-between py-8 px-2 pointer-events-none opacity-20">
        {[1, 2, 3, 4].map(l => <div key={l} className="w-2 h-[1px] bg-white ml-auto" />)}
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-black text-white mix-blend-difference drop-shadow-md">
          {fillLevel.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
