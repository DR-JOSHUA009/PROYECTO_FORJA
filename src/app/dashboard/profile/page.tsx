"use client";

import { motion } from "framer-motion";
import { User, Scale, Ruler, Target, Dumbbell, AlertTriangle, Save, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(data || {});
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("users_profile").upsert({
      user_id: user.id,
      full_name: profile.full_name,
      username: profile.username,
      weight_kg: parseFloat(profile.weight_kg),
      height_cm: parseFloat(profile.height_cm),
      age: parseInt(profile.age),
      gender: profile.gender,
      goal: profile.goal,
      intensity: profile.intensity,
      equipment: profile.equipment,
      experience_level: profile.experience_level,
      injuries: profile.injuries,
      diseases: profile.diseases,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (!error) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Perfil Biométrico <User className="text-primary w-6 h-6" />
          </h1>
          <p className="text-text-secondary">Tus datos maestros sincronizados con la IA.</p>
        </div>
        {savedSuccess && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" /> Guardado
          </motion.div>
        )}
      </header>

      <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* IDENTIDAD */}
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Identidad</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Nombre Completo</label>
            <input 
              type="text" 
              value={profile.full_name || ""} 
              onChange={e => setProfile({...profile, full_name: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none" 
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Nombre de Usuario</label>
            <input 
              type="text" 
              value={profile.username || ""} 
              onChange={e => setProfile({...profile, username: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none font-mono" 
            />
          </div>
        </div>

        {/* MÉTRICAS */}
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Métricas Físicas</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-2">
                <Scale className="w-3 h-3" /> Peso (kg)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={profile.weight_kg || ""} 
                onChange={e => setProfile({...profile, weight_kg: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none font-mono" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-2">
                <Ruler className="w-3 h-3" /> Altura (cm)
              </label>
              <input 
                type="number" 
                value={profile.height_cm || ""} 
                onChange={e => setProfile({...profile, height_cm: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none font-mono" 
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Género</label>
            <select 
              value={profile.gender || ""} 
              onChange={e => setProfile({...profile, gender: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
            >
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        {/* OBJETIVOS Y EQUIPO */}
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Estrategia</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-2">
              <Target className="w-3 h-3" /> Objetivo
            </label>
            <select 
              value={profile.goal || ""} 
              onChange={e => setProfile({...profile, goal: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
            >
              <option value="cut">Definición (Perder Grasa)</option>
              <option value="bulk">Volumen (Ganar Músculo)</option>
              <option value="maintain">Mantenimiento</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-2">
              <Dumbbell className="w-3 h-3" /> Equipo Disponible
            </label>
            <input 
              type="text" 
              value={profile.equipment || ""} 
              placeholder="Ej: Gym completo, solo mancuernas..."
              onChange={e => setProfile({...profile, equipment: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none" 
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Nivel de Experiencia</label>
            <select 
              value={profile.experience_level || ""} 
              onChange={e => setProfile({...profile, experience_level: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
            >
              <option value="principiante">Principiante (&lt; 1 año)</option>
              <option value="intermedio">Intermedio (1-3 años)</option>
              <option value="avanzado">Avanzado (&gt; 3 años)</option>
            </select>
          </div>
        </div>

        {/* SALUD */}
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Riesgos y Salud</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-orange-400" /> Lesiones
            </label>
            <textarea 
              value={profile.injuries || ""} 
              placeholder="Ej: Dolor lumbar, rodilla izquierda..."
              onChange={e => setProfile({...profile, injuries: e.target.value})}
              className="w-full h-24 bg-background border border-white/10 rounded-xl p-4 text-white focus:border-primary transition-colors outline-none resize-none" 
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Enfermedades</label>
            <input 
              type="text" 
              value={profile.diseases || ""} 
              placeholder="Ej: Asma, Diabetes..."
              onChange={e => setProfile({...profile, diseases: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none" 
            />
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end mt-4">
          <button 
            type="submit"
            disabled={saving}
            className="h-14 px-10 rounded-2xl bg-white text-background font-black text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            {saving ? "Salvando..." : <>Guardar Cambios <Save className="w-5 h-5" /></>}
          </button>
        </div>

      </form>
    </div>
  );
}
