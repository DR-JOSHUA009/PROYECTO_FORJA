"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoveRight, MoveLeft, Activity, HeartPulse, Dumbbell, Calendar, Apple, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

// Form Data Type
interface OnboardingData {
  nombre: string;
  usuario: string;
  peso: string;
  altura: string;
  edad: string;
  genero: string;
  lesiones: string[];
  enfermedades: string[];
  equipo: string;
  dias: number;
  intensidad: string;
  experiencia: string;
  dieta: string;
  alergias: string[];
  objetivo: string;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Si no hay sesión, mandamos a login
        router.push("/login?message=Acceso restringido. Inicia sesión.");
      } else {
        setCheckingAuth(false);
      }
    };
    checkUser();
  }, [router]);
  
  const [data, setData] = useState<OnboardingData>({
    nombre: "", usuario: "",
    peso: "", altura: "", edad: "", genero: "",
    lesiones: [], enfermedades: [],
    equipo: "",
    dias: 4, intensidad: "", experiencia: "principiante",
    dieta: "", alergias: [],
    objetivo: ""
  });

  const nextStep = () => {
    if (step < 6) {
      setDirection(1);
      setStep((prev) => prev + 1);
    } else {
      submitData();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((prev) => prev - 1);
    }
  };

  const submitData = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast("¡Plan Maestro compilado con éxito! Bienvenido a FORJA.", "success");
        router.push("/dashboard/home");
      } else {
        const err = await res.json();
        toast(err.error || "Ocurrió un error al guardar", "error");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return data.nombre && data.usuario && data.peso && data.altura && data.edad && data.genero;
      case 2: return true; // Lesiones y enfermedades pueden estar vacías
      case 3: return data.equipo !== "";
      case 4: return data.dias > 0 && data.intensidad !== "" && data.experiencia !== "";
      case 5: return data.dieta !== "";
      case 6: return data.objetivo !== "";
      default: return false;
    }
  };

  const variants: any = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3, ease: "easeIn" }
    })
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white font-mono text-xs uppercase mt-6 tracking-widest animate-pulse">Verificando Credenciales...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[#0a0a0a] relative overflow-hidden">
      
      {/* ProgressBar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <motion.div 
          className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 6) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className="w-10 h-10 flex items-center justify-center rounded-full glass border border-white/10 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors hover:bg-white/10"
          >
            <MoveLeft className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div 
                key={s} 
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${s === step ? "bg-white" : s < step ? "bg-white/40" : "bg-white/10"}`}
              />
            ))}
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Animated Form Container */}
        <div className="relative glass p-8 rounded-[24px] overflow-hidden min-h-[440px] shadow-[0_4px_40px_rgba(0,0,0,0.8)] border border-white/10">
          
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div key="step1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Tu cuerpo</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Nombre Completo</label>
                    <input type="text" value={data.nombre} onChange={e => setData({...data, nombre: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-white transition-colors" placeholder="Tu nombre" />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Username (ID de Red)</label>
                    <input type="text" value={data.usuario} onChange={e => setData({...data, usuario: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-white transition-colors" placeholder="@usuario" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Peso (kg)</label>
                    <input type="number" value={data.peso} onChange={e => setData({...data, peso: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-white transition-colors" placeholder="Ej. 75" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Altura (cm)</label>
                    <input type="number" value={data.altura} onChange={e => setData({...data, altura: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-white transition-colors" placeholder="Ej. 178" />
                  </div>
                  <div className="flex flex-col gap-1 col-span-1">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Edad</label>
                    <input type="number" value={data.edad} onChange={e => setData({...data, edad: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-white transition-colors" placeholder="Años" />
                  </div>
                  <div className="flex flex-col gap-1 col-span-1">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Género</label>
                    <select value={data.genero} onChange={e => setData({...data, genero: e.target.value})} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white outline-none focus:border-white transition-colors appearance-none">
                      <option value="" disabled className="bg-[#111]">Elegir</option>
                      <option value="Hombre" className="bg-[#111]">Hombre</option>
                      <option value="Mujer" className="bg-[#111]">Mujer</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <HeartPulse className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Tu salud</h2>
                </div>
                <div className="flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Lesiones o Dolores</label>
                    <textarea 
                      value={data.lesiones.join(", ")} 
                      onChange={e => setData({...data, lesiones: e.target.value.split(", ")})} 
                      className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-white transition-colors resize-none" 
                      placeholder="Ej. Dolor leve en hombro derecho, operación de rodilla..." 
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["Ninguna", "Hombros", "Rodillas", "Espalda Baja"].map(chip => (
                        <button key={chip} onClick={() => setData({...data, lesiones: [chip]})} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-text-secondary hover:text-white transition-colors">
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Condiciones Médicas</label>
                    <input 
                      type="text" 
                      value={data.enfermedades.join(", ")} 
                      onChange={e => setData({...data, enfermedades: e.target.value.split(", ")})} 
                      className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-white transition-colors" 
                      placeholder="Diabetes, asma, hipertensión (dejar vacío si ninguna)" 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Dumbbell className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Equipamiento</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1 content-center">
                  {[
                    { val: "bodyweight", label: "Peso Corporal", desc: "Sin equipo" },
                    { val: "dumbbells", label: "Pesas Caseras", desc: "Mancuernas y barras" },
                    { val: "gym", label: "Gym Completo", desc: "Máquinas completas" },
                    { val: "mixed", label: "Híbrido", desc: "Casa + Gym" }
                  ].map(eq => (
                    <button 
                      key={eq.val} 
                      onClick={() => setData({...data, equipo: eq.val})}
                      className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${data.equipo === eq.val ? "bg-white text-background border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "glass border-white/10 text-white hover:border-white/30"}`}
                    >
                      <span className="font-bold">{eq.label}</span>
                      <span className={`text-xs ${data.equipo === eq.val ? "text-[#333]" : "text-text-secondary"}`}>{eq.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Calendar className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Tu rutina</h2>
                </div>
                <div className="flex flex-col gap-6 flex-1 justify-center">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary flex justify-between">
                      <span>Días disponibles</span>
                      <span className="text-white font-bold">{data.dias} días</span>
                    </label>
                    <input 
                      type="range" min="1" max="6" step="1" 
                      value={data.dias} onChange={e => setData({...data, dias: parseInt(e.target.value)})}
                      className="w-full accent-white" 
                    />
                    <div className="flex justify-between text-xs text-text-secondary mt-1">
                      <span>Mínimo 1</span><span>Máximo 6 (1 descanso min)</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Experiencia y Nivel</label>
                    <div className="flex gap-2">
                      {[
                        { val: "principiante", label: "0-1 años" },
                        { val: "intermedio", label: "2-4 años" },
                        { val: "avanzado", label: "5+ años" }
                      ].map(exp => (
                        <button 
                          key={exp.val} 
                          onClick={() => setData({...data, experiencia: exp.val})}
                          className={`flex-1 h-12 rounded-xl text-[10px] font-bold border transition-all uppercase tracking-widest ${data.experiencia === exp.val ? "bg-white text-background border-white" : "glass border-white/10 text-white"}`}
                        >
                          {exp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Intensidad IA Objetivo</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { val: "suave", label: "Conservadora", desc: "Prioridad en adaptación articular" },
                        { val: "moderada", label: "Progresiva", desc: "Sobrecarga óptima" },
                        { val: "intensa", label: "Agresiva", desc: "Volumen letal" }
                      ].map(int => (
                        <button 
                          key={int.val} 
                          onClick={() => setData({...data, intensidad: int.val})}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${data.intensidad === int.val ? "bg-white text-background border-white" : "glass border-white/10 text-white hover:border-white/30"}`}
                        >
                          <span className="font-bold">{int.label}</span>
                          <span className={`text-[10px] uppercase font-mono ${data.intensidad === int.val ? "text-black/60" : "text-text-secondary"}`}>{int.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Apple className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Tu alimentación</h2>
                </div>
                <div className="flex flex-col gap-6 flex-1">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Régimen Base</label>
                    <select 
                      value={data.dieta} 
                      onChange={e => setData({...data, dieta: e.target.value})}
                      className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-white transition-colors cursor-pointer appearance-none"
                    >
                      <option value="" disabled className="bg-[#111]">Seleccionar tipo de dieta</option>
                      <option value="omnivoro" className="bg-[#111]">Omnívoro (General)</option>
                      <option value="vegetariano" className="bg-[#111]">Vegetariano</option>
                      <option value="vegano" className="bg-[#111]">Vegano</option>
                      <option value="keto" className="bg-[#111]">Keto / Baja en Carbos</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-widest text-text-secondary">Restricciones Categóricas</label>
                    <textarea 
                      value={data.alergias.join(", ")} 
                      onChange={e => setData({...data, alergias: e.target.value.split(", ")})} 
                      className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-white transition-colors resize-none" 
                      placeholder="Intolerante a lactosa, odio el brócoli..." 
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div key="step6" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Target className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">Tu objetivo</h2>
                </div>
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  {[
                    { val: "cut", label: "Definición (Quemar Grasa)" },
                    { val: "bulk", label: "Volumen (Ganar Masa Muscular)" },
                    { val: "maintain", label: "Mantenimiento (Recomposición)" },
                    { val: "endurance", label: "Resistencia Cardiovascular" }
                  ].map(obj => (
                    <button 
                      key={obj.val} 
                      onClick={() => setData({...data, objetivo: obj.val})}
                      className={`h-14 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${data.objetivo === obj.val ? "bg-white text-background border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "glass border-white/10 text-white hover:border-white/30"}`}
                    >
                      {obj.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next Button Footer */}
          <div className="mt-8">
            <button
              onClick={nextStep}
              disabled={!isStepValid() || isSubmitting}
              className="w-full h-12 bg-white text-background font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-background/20 border-t-background animate-spin" />
                  Procesando LLM...
                </span>
              ) : (
                <>
                  {step === 6 ? "Compilar Plan Maestro" : "Confirmar Bloque"}
                  {step < 6 && <MoveRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
