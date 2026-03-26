"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon3D } from "./Icon3D";
import { X, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";

interface AchievementModalProps {
  achievement: {
    name: string;
    desc: string;
    xp: number;
    icon: any;
    color: string;
  } | null;
  onClose: () => void;
}

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClose = useCallback(() => {
    setShow(false);
    // Limpiar auto-close timer si existe
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Esperar a que la animación de salida termine antes de notificar al padre
    setTimeout(() => {
      onClose();
    }, 500);
  }, [onClose]);

  useEffect(() => {
    if (achievement) {
      setShow(true);
      // Auto-cerrar después de 8 segundos si el usuario no interactúa
      timerRef.current = setTimeout(() => {
        handleClose();
      }, 8000);
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    } else {
      setShow(false);
    }
  }, [achievement, handleClose]);

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Overlay con blur dinámico */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Contenedor del Modal */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md glass p-1 rounded-[40px] border border-white/10 overflow-hidden"
          >
            {/* Fondo de luz detrás del icono */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-[100px] opacity-30 -z-10 rounded-full"
              style={{ backgroundColor: achievement.color }}
            />

            <div className="bg-white/3 p-10 rounded-[36px] flex flex-col items-center text-center">
              {/* Botón Cerrar */}
              <button 
                onClick={handleClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
              >
                <X className="w-4 h-4 text-white/50" />
              </button>

              {/* Icono 3D Animado */}
              <motion.div
                initial={{ rotateY: 180, scale: 0 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: 0.2 
                }}
                className="mb-8 p-6 bg-white/5 rounded-full border border-white/10 shadow-2xl relative"
              >
                 <Icon3D icon={achievement.icon} color={achievement.color} size={84} />
                 
                 {/* Destellos decorativos */}
                 <motion.div 
                   animate={{ 
                     scale: [1, 1.2, 1],
                     opacity: [0.5, 1, 0.5]
                   }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute -top-2 -right-2 text-yellow-400"
                 >
                   <Sparkles className="w-8 h-8 fill-yellow-400/20" />
                 </motion.div>
              </motion.div>

              {/* Texto del Logro */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">¡NUEVO LOGRO DESBLOQUEADO!</h4>
                <h2 className="text-3xl font-black text-white italic mb-4 leading-tight">&quot;{achievement.name.toUpperCase()}&quot;</h2>
                <p className="text-sm text-text-secondary leading-relaxed px-4">{achievement.desc}</p>
              </motion.div>

              {/* Badge de XP */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 group cursor-default"
              >
                <div className="p-2 bg-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                   <span className="text-[10px] text-text-muted font-bold tracking-widest leading-none">RECOMPENSA</span>
                   <span className="text-xl font-black text-white italic leading-none">+{achievement.xp} XP</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
