"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon3D } from "./Icon3D";
import { X, Sparkles, TrendingUp, Star } from "lucide-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";

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

// Partícula de confetti generada aleatoriamente
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  const style = useMemo(() => {
    const left = Math.random() * 100;
    const size = Math.random() * 8 + 4;
    const duration = Math.random() * 2 + 2;
    const rotEnd = Math.random() * 720 - 360;
    const xDrift = Math.random() * 80 - 40;
    return { left, size, duration, rotEnd, xDrift };
  }, []);

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{
        y: 500,
        x: style.xDrift,
        opacity: [1, 1, 0.8, 0],
        rotate: style.rotEnd,
        scale: [1, 1.2, 0.8, 0.5],
      }}
      transition={{
        duration: style.duration,
        delay: delay,
        ease: "easeOut",
      }}
      style={{
        position: "absolute",
        left: `${style.left}%`,
        top: 0,
        width: style.size,
        height: style.size * (Math.random() > 0.5 ? 1 : 0.5),
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
        zIndex: 60,
        pointerEvents: "none" as const,
      }}
    />
  );
}

// Anillo de glow que se expande desde el centro
function GlowRing({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      initial={{ scale: 0.3, opacity: 0.8 }}
      animate={{ scale: 3, opacity: 0 }}
      transition={{
        duration: 2,
        delay: delay,
        ease: "easeOut",
      }}
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}40, inset 0 0 20px ${color}20`,
        pointerEvents: "none" as const,
      }}
    />
  );
}

// Partícula flotante decorativa
function FloatingParticle({ delay }: { delay: number }) {
  const angle = useMemo(() => Math.random() * Math.PI * 2, []);
  const radius = useMemo(() => Math.random() * 80 + 40, []);
  const size = useMemo(() => Math.random() * 3 + 1, []);

  return (
    <motion.div
      initial={{
        x: 0,
        y: 0,
        opacity: 0,
        scale: 0,
      }}
      animate={{
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        opacity: [0, 1, 1, 0],
        scale: [0, 1.5, 1, 0],
      }}
      transition={{
        duration: 2.5,
        delay: delay,
        ease: "easeOut",
      }}
      className="absolute rounded-full bg-white"
      style={{
        width: size,
        height: size,
        left: "50%",
        top: "50%",
        pointerEvents: "none",
        boxShadow: "0 0 6px rgba(255,255,255,0.8)",
      }}
    />
  );
}

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generar partículas de confetti
  const confettiColors = useMemo(() => {
    const base = achievement?.color || "#ffffff";
    return [base, "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F59E0B", "#EC4899", "#10B981"];
  }, [achievement?.color]);

  const confettiParticles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    }));
  }, [confettiColors]);

  const floatingParticles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: 0.3 + Math.random() * 0.5,
    }));
  }, []);

  const handleClose = useCallback(() => {
    setShow(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => {
      onClose();
    }, 500);
  }, [onClose]);

  useEffect(() => {
    if (achievement) {
      setShow(true);
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

          {/* Confetti Layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            {confettiParticles.map((p) => (
              <ConfettiParticle key={p.id} delay={p.delay} color={p.color} />
            ))}
          </div>

          {/* Flash de luz inicial */}
          <motion.div
            initial={{ opacity: 0.6, scale: 0.5 }}
            animate={{ opacity: 0, scale: 3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute w-64 h-64 rounded-full pointer-events-none z-40"
            style={{
              background: `radial-gradient(circle, ${achievement.color}60 0%, transparent 70%)`,
            }}
          />

          {/* Contenedor del Modal */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 60, rotateX: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -30 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 22,
              mass: 0.8,
            }}
            className="relative w-full max-w-md glass p-1 rounded-[40px] border border-white/10 overflow-hidden z-50"
          >
            {/* Borde animado con gradiente giratorio */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-[1px] rounded-[40px] -z-10 opacity-40"
              style={{
                background: `conic-gradient(from 0deg, ${achievement.color}, transparent, ${achievement.color}, transparent, ${achievement.color})`,
              }}
            />

            {/* Fondo de luz detrás del icono */}
            <motion.div
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 blur-[120px] -z-10 rounded-full"
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

              {/* Label "DESBLOQUEADO" con entrada dramática */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
                className="overflow-hidden mb-6"
              >
                <div className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 whitespace-nowrap">
                    LOGRO DESBLOQUEADO
                  </span>
                  <motion.div
                    animate={{ rotate: [0, -15, 15, 0] }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Icono 3D Animado con Glow Rings */}
              <div className="relative mb-8">
                {/* Glow rings que se expanden */}
                <GlowRing delay={0.3} color={achievement.color} />
                <GlowRing delay={0.6} color={achievement.color} />
                <GlowRing delay={0.9} color={achievement.color} />

                {/* Partículas flotantes alrededor */}
                {floatingParticles.map((p) => (
                  <FloatingParticle key={p.id} delay={p.delay} />
                ))}

                <motion.div
                  initial={{ rotateY: 180, scale: 0 }}
                  animate={{ rotateY: 0, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.2,
                  }}
                  className="p-6 bg-white/5 rounded-full border border-white/10 shadow-2xl relative"
                  style={{
                    boxShadow: `0 0 40px ${achievement.color}30, 0 0 80px ${achievement.color}15`,
                  }}
                >
                  <Icon3D icon={achievement.icon} color={achievement.color} size={84} />

                  {/* Destellos decorativos */}
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                      rotate: [0, 15, 0],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-2 -right-2 text-yellow-400"
                  >
                    <Sparkles className="w-8 h-8 fill-yellow-400/20" />
                  </motion.div>

                  {/* Segundo destello en la esquina opuesta */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.8, 0.3],
                      rotate: [0, -20, 0],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                    className="absolute -bottom-1 -left-1 text-yellow-400"
                  >
                    <Sparkles className="w-5 h-5 fill-yellow-400/20" />
                  </motion.div>
                </motion.div>

                {/* Glow estático de fondo */}
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-6 rounded-full -z-10"
                  style={{
                    background: `radial-gradient(circle, ${achievement.color}25 0%, transparent 70%)`,
                  }}
                />
              </div>

              {/* Texto del Logro con efecto de revelado */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <h2 className="text-3xl font-black text-white italic mb-4 leading-tight">
                  &quot;{achievement.name.toUpperCase()}&quot;
                </h2>
                <p className="text-sm text-text-secondary leading-relaxed px-4">
                  {achievement.desc}
                </p>
              </motion.div>

              {/* Línea decorativa con gradiente */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6, ease: "easeOut" }}
                className="w-32 h-[1px] my-6"
                style={{
                  background: `linear-gradient(90deg, transparent, ${achievement.color}60, transparent)`,
                }}
              />

              {/* Badge de XP con animación de contador */}
              <motion.div
                initial={{ y: 25, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 group cursor-default relative overflow-hidden"
              >
                {/* Shimmer effect */}
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{ delay: 1.2, duration: 1, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                />

                <div className="p-2 bg-primary/20 rounded-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-[10px] text-text-muted font-bold tracking-widest leading-none">
                    RECOMPENSA
                  </span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-xl font-black text-white italic leading-none"
                  >
                    +{achievement.xp} XP
                  </motion.span>
                </div>
              </motion.div>

              {/* Barra de progreso decorativa */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-5 w-full"
              >
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 1.3, duration: 1.5, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${achievement.color}80, ${achievement.color})`,
                      boxShadow: `0 0 10px ${achievement.color}60`,
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
