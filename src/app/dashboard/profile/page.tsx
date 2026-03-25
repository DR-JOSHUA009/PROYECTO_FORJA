"use client";

import { motion } from "framer-motion";
import { User, Scale, Ruler, Target, Dumbbell, AlertTriangle, Save, CheckCircle2, LogOut, Mail, Calendar, Zap, Trophy, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Icon3D } from "@/components/ui/Icon3D";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email || "");

      const { data } = await supabase.from("users_profile").select("*").eq("user_id", user.id).single();
      setProfile(data || {});
      setLoading(false);
    }
    loadProfile();
  }, [supabase]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("users").upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

    const profileData: any = {
      user_id: user.id,
      full_name: profile.full_name,
      username: profile.username,
      weight_kg: profile.weight_kg ? parseFloat(profile.weight_kg) : null,
      height_cm: profile.height_cm ? parseFloat(profile.height_cm) : null,
      age: profile.age ? parseInt(profile.age) : null,
      gender: profile.gender,
      goal: profile.goal,
      intensity: profile.intensity,
      equipment: profile.equipment,
      experience_level: profile.experience_level,
      training_days: profile.training_days ? parseInt(profile.training_days) : null,
      injuries: profile.injuries,
      diseases: profile.diseases,
      diet_type: profile.diet_type,
      updated_at: new Date().toISOString()
    };

    if (profile.id) profileData.id = profile.id;

    const { error } = await supabase.from("users_profile").upsert(profileData, { onConflict: 'user_id' });

    if (!error) {
      toast("✅ Perfil actualizado correctamente", "success");
    } else {
      toast("Error al guardar: " + error.message, "error");
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20 w-full h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const currentLevel = profile?.level || 1;
  const currentXp = profile?.xp || 0;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            Perfil <Icon3D icon={User} color="white" size={32} />
          </h1>
          <p className="text-text-secondary">Tus datos maestros sincronizados con la IA.</p>
        </div>
        
        {/* NIVEL + XP BADGE */}
        <div className="flex items-center gap-4">
          <div className="glass px-5 py-3 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">LVL</span>
              <span className="text-2xl font-black text-white">{currentLevel}</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono">XP</span>
              <span className="text-2xl font-black text-primary">{currentXp}</span>
            </div>
          </div>
        </div>
      </header>

      {/* EMAIL + CUENTA (solo lectura) */}
      <div className="glass p-6 rounded-2xl border border-white/5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-text-muted" />
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono block">Email vinculado</span>
            <span className="text-white font-mono text-sm">{email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-mono block">Estado</span>
            <span className="text-emerald-400 text-sm font-bold">Verificado</span>
          </div>
        </div>
      </div>

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
          
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
                <Scale className="w-3 h-3" /> Peso
              </label>
              <input 
                type="number" step="0.1"
                value={profile.weight_kg || ""} 
                onChange={e => setProfile({...profile, weight_kg: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none font-mono" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Altura
              </label>
              <input 
                type="number" 
                value={profile.height_cm || ""} 
                onChange={e => setProfile({...profile, height_cm: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none font-mono" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Edad
              </label>
              <input 
                type="number" 
                value={profile.age || ""} 
                onChange={e => setProfile({...profile, age: e.target.value})}
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

        {/* ESTRATEGIA */}
        <div className="glass p-6 rounded-2xl border border-white/5 flex flex-col gap-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/5 pb-4">Estrategia</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
                <Target className="w-3 h-3" /> Objetivo
              </label>
              <select 
                value={profile.goal || ""} 
                onChange={e => setProfile({...profile, goal: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
              >
                <option value="cut">Definición</option>
                <option value="bulk">Volumen</option>
                <option value="maintain">Mantener</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
                <Zap className="w-3 h-3" /> Intensidad
              </label>
              <select 
                value={profile.intensity || ""} 
                onChange={e => setProfile({...profile, intensity: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Días/Semana
              </label>
              <input 
                type="number" min="1" max="7"
                value={profile.training_days || ""} 
                onChange={e => setProfile({...profile, training_days: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none font-mono" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Experiencia</label>
              <select 
                value={profile.experience_level || ""} 
                onChange={e => setProfile({...profile, experience_level: e.target.value})}
                className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
              >
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono flex items-center gap-1">
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
            <label className="text-xs text-text-secondary uppercase tracking-widest font-mono">Tipo de Dieta</label>
            <select 
              value={profile.diet_type || ""} 
              onChange={e => setProfile({...profile, diet_type: e.target.value})}
              className="w-full h-12 bg-background border border-white/10 rounded-xl px-4 text-white focus:border-primary transition-colors outline-none cursor-pointer appearance-none"
            >
              <option value="normal">Normal (Sin restricción)</option>
              <option value="vegetariano">Vegetariano</option>
              <option value="vegano">Vegano</option>
              <option value="keto">Keto</option>
              <option value="paleo">Paleo</option>
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

        {/* ACCIONES */}
        <div className="md:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
          <button 
            type="button"
            onClick={handleLogout}
            className="h-12 px-8 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 font-bold hover:bg-red-500/10 transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>

          <button 
            type="submit"
            disabled={saving}
            className="h-14 px-10 rounded-2xl bg-white text-background font-black text-lg flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Guardando...
              </>
            ) : (
              <>Guardar Cambios <Save className="w-5 h-5" /></>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
