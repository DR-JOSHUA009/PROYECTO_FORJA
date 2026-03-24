"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Plus, Timer, History, Save, Activity, X, Play, CheckCircle, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";

export default function GymModule() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [todayRoutine, setTodayRoutine] = useState<any>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [focusTimer, setFocusTimer] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  const router = useRouter();

  async function fetchRoutine() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sincronización de seguridad
    await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    const days = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const today = days[new Date().getDay()];

    const { data } = await supabase.from("routines").select("*").eq("user_id", user.id).eq("day_of_week", today).single();
    setTodayRoutine(data || null);
    
    // Fetch logs (filtered by user_id)
    const { data: logs, error: logsError } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (logsError) console.error("Error logs:", logsError);
    setHistoryLogs(logs || []);
    
    setLoading(false);
  }

  useEffect(() => {
    fetchRoutine();
  }, []);

  const handleGenerateMasterRoutine = async () => {
    setIsGenerating(true);
    toast("Forja está analizando tus datos maestros...", "info");
    
    try {
      const res = await fetch("/api/gym/generate-routine", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        toast("Rutina maestra de 5 días aplicada con éxito ⚡", "success");
        fetchRoutine();
      } else {
        toast(data.error || "Error al generar la rutina", "error");
      }
    } catch (err) {
      toast("Error de conexión con el motor maestro", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFinishWorkout = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sincronización de seguridad
    await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    toast("Guardando rendimiento...", "info");
    
    try {
      // Insert Log
      const { error: logError } = await supabase.from("workout_logs").insert({
        user_id: user.id,
        routine_name: todayRoutine?.day_of_week || "Entrenamiento",
        exercises_completed: todayRoutine?.exercises || [],
        duration_min: Math.floor(focusTimer / 60)
      });

      if (logError) throw logError;

      // Update XP in users_profile (Master Schema)
      const { data: pData } = await supabase.from("users_profile").select("xp, level").eq("user_id", user.id).single();
      const currentXp = pData?.xp || 0;
      const newXp = currentXp + 350;
      const newLevel = Math.floor(newXp / 1000) + 1;

      await supabase.from("users_profile").update({ 
        xp: newXp,
        level: newLevel
      }).eq("user_id", user.id);

      toast("¡Sesión Registrada! +350 XP", "success");
      setFocusMode(false);
      fetchRoutine(); // Refresh logs
      router.push("/dashboard/home");
    } catch (e: any) {
      console.error("Finish error:", e);
      toast("Error al guardar: " + (e.message || "desconocido"), "error");
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (focusMode) {
      interval = setInterval(() => {
        setFocusTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [focusMode]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full relative">
      
      <AnimatePresence>
        {focusMode && todayRoutine && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] bg-background text-white flex flex-col p-6 md:p-12"
          >
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-xl tracking-widest">{formatTime(focusTimer)}</span>
              </div>
              <button onClick={() => setFocusMode(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center">
              <span className="text-primary font-mono tracking-widest uppercase mb-4 text-sm border border-primary/20 bg-primary/10 px-4 py-1.5 rounded-full">
                Ejercicio {currentExerciseIdx + 1} de {todayRoutine.exercises.length}
              </span>
              <h2 className="text-3xl md:text-6xl font-black mb-6 md:mb-8 leading-tight">
                {todayRoutine.exercises[currentExerciseIdx]?.name}
              </h2>
              <div className="text-xl md:text-2xl text-text-secondary font-mono bg-white/5 border border-white/10 px-6 py-3 md:px-8 md:py-4 rounded-2xl mb-8 md:mb-12">
                {todayRoutine.exercises[currentExerciseIdx]?.sets} Series × <span className="text-white">{todayRoutine.exercises[currentExerciseIdx]?.reps} Reps</span>
              </div>

              <div className="flex gap-4 w-full justify-center">
                {currentExerciseIdx > 0 && (
                  <button 
                    onClick={() => setCurrentExerciseIdx(prev => prev - 1)}
                    className="h-16 px-8 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
                  >
                    Anterior
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (currentExerciseIdx < todayRoutine.exercises.length - 1) {
                      setCurrentExerciseIdx(prev => prev + 1);
                    } else {
                      handleFinishWorkout();
                    }
                  }}
                  className="h-16 flex-1 max-w-xs rounded-2xl bg-white text-background font-black text-lg flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  {currentExerciseIdx < todayRoutine.exercises.length - 1 ? (
                    <>Siguiente <Play className="w-5 h-5 fill-current" /></>
                  ) : (
                    <>Finalizar Sesión <CheckCircle className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </div>
            
            <div className="w-full h-1 bg-white/10 rounded-full mt-auto overflow-hidden">
              <motion.div 
                className="h-full bg-primary"
                animate={{ width: `${((currentExerciseIdx) / todayRoutine.exercises.length) * 100}%` }}
              />
            </div>
          </motion.div>
        )}

        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setShowHistory(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-xl glass flex items-center justify-center border border-white/10 hover:border-white/30"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <History className="w-6 h-6 text-primary" /> Historial Reciente
              </h3>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                {historyLogs.length === 0 ? (
                  <div className="text-center p-10 text-white/40 italic">No hay registros de entrenamientos aún.</div>
                ) : (
                  historyLogs.map((log) => (
                    <div key={log.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex justify-between items-center group hover:border-primary/30 transition-all">
                      <div>
                        <p className="text-sm font-mono text-primary uppercase tracking-widest">{log.routine_name}</p>
                        <p className="text-lg font-bold text-white mt-1">{new Date(log.created_at).toLocaleDateString()}</p>
                        <p className="text-xs text-text-muted mt-1">{log.exercises_completed?.length || 0} ejercicios completados</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white">{log.duration_min || 0}</span>
                        <span className="text-[10px] text-text-muted uppercase ml-1">min</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Entrenamiento <Icon3D icon={Dumbbell} color="white" size={32} />
          </h1>
          <p className="text-text-secondary">Bloque activo: <span className="text-white font-mono uppercase tracking-widest text-xs">{todayRoutine?.day_of_week || "Hoy"}</span></p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleGenerateMasterRoutine}
            disabled={isGenerating}
            className={`h-10 px-4 rounded-xl bg-primary text-background flex items-center gap-2 text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(9,250,211,0.2)] disabled:opacity-50 disabled:cursor-wait`}
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4" /> Smart Generate
              </>
            )}
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="h-10 px-4 rounded-xl glass border border-white/10 hover:border-white/30 text-white flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <History className="w-4 h-4" /> Historial
          </button>
        </div>
      </header>

      {/* RUTINA DEL DÍA - TRACKER INTERACTIVO */}
      {todayRoutine ? (
        todayRoutine.is_rest_day ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-2 text-text-secondary glass rounded-2xl border border-white/5">
            <Activity className="w-16 h-16 text-primary opacity-50 mb-2" />
            <span className="font-bold text-2xl text-white">Día de Descanso</span>
            <span className="text-sm">Dedica este día a recuperación. Estiramientos ligeros o caminata suave.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            
            <div className="w-full bg-primary/10 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-primary font-bold text-lg leading-tight">Modo Enfoque</span>
                <span className="text-xs text-text-secondary">Activa el temporizador de descanso y la UI inmersiva para tu entrenamiento en vivo.</span>
              </div>
              <button 
                onClick={() => {
                  setFocusTimer(0);
                  setCurrentExerciseIdx(0);
                  setFocusMode(true);
                }}
                className="h-12 px-6 rounded-xl bg-primary text-background font-bold shadow-[0_0_15px_rgba(9,250,211,0.3)] hover:scale-105 transition-all text-sm w-full md:w-auto flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Iniciar Sesión
              </button>
            </div>

            {todayRoutine.exercises?.map((exercise: any, idx: number) => {
              const setsCount = parseInt(exercise.sets) || 3;
              const setsArray = Array.from({ length: setsCount }, (_, i) => i + 1);

              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <h2 className="text-lg font-bold text-white">{idx + 1}. {exercise.name}</h2>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                      <Timer className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-4 gap-2 text-[9px] md:text-[10px] text-text-muted uppercase tracking-widest font-mono pl-4">
                      <span>Serie</span>
                      <span>Obj</span>
                      <span>Peso</span>
                      <span className="hidden md:inline">Hechas</span>
                      <span className="md:hidden">Log</span>
                    </div>
                    
                    {setsArray.map((_, sIdx) => (
                      <div key={sIdx} className="grid grid-cols-4 gap-2 items-center bg-background border border-white/5 p-2 px-4 rounded-xl hover:border-white/20 transition-colors group">
                        <span className="text-white font-bold group-hover:text-primary transition-colors">{sIdx + 1}</span>
                        <span className="text-text-secondary text-sm">{exercise.reps}</span>
                        <input type="number" placeholder="0" className="w-full max-w-[60px] h-10 bg-transparent text-white font-mono text-center border-b border-white/10 tracking-wider focus:border-white outline-none" />
                        <input type="number" placeholder="-" className="w-full max-w-[60px] h-10 bg-white/5 rounded-lg text-white font-mono text-center border border-transparent focus:border-white/50 outline-none" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => toast("Entrenamiento Registrado Manualmente", "success")}
                className="h-14 px-8 rounded-xl border border-white/10 text-white flex items-center gap-2 text-sm font-bold hover:bg-white/5 transition-all w-full md:w-auto justify-center"
              >
                <Save className="w-5 h-5" /> Guardar Sin Iniciar Focus
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center p-20 text-center text-text-secondary glass rounded-2xl border border-white/5">
          <span className="mb-2 opacity-50"><Dumbbell className="w-12 h-12"/></span>
          <span className="text-sm">No se ha generado rutina actual. Completa el Onboarding o pide a la IA que cree una para ti.</span>
        </div>
      )}
    </div>
  );
}
