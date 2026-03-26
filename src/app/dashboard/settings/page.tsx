"use client";

import { motion } from "framer-motion";
import { Settings, Shield, Bell, CreditCard, ChevronRight, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Icon3D } from "@/components/ui/Icon3D";

export default function SettingsModule() {
  const [userEmail, setUserEmail] = useState<string>("Cargando...");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserEmail(user.email || "Sin email");
    }
    loadUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          Configuración <Icon3D icon={Settings} color="#ffffff" size={28} />
        </h1>
        <p className="text-text-secondary">Configuración del sistema y preferencias de la cuenta.</p>
      </header>

      <div className="flex flex-col gap-6">
        
        {/* SECTOR 1 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/2">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Icon3D icon={Shield} color="#09fad3" size={18} /> Cuenta
            </h2>
          </div>
          <div className="p-2 flex flex-col">
             {[
               { name: "Correo Electrónico", val: userEmail },
               { name: "Contraseña", val: "••••••••••••" },
               { name: "Autenticación", val: "Activa" },
             ].map((set, i) => (
                <div key={i} className="flex justify-between items-center p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                  <span className="text-sm text-text-secondary">{set.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{set.val}</span>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                  </div>
                </div>
             ))}
          </div>
        </motion.div>

        {/* SECTOR 2 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/2">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Icon3D icon={CreditCard} color="#ffffff" size={18} /> Suscripción
            </h2>
          </div>
          <div className="p-6 flex justify-between items-center">
             <div className="flex flex-col gap-1">
               <span className="text-lg font-bold text-white">Versión Base Activa</span>
               <span className="text-sm text-text-secondary">Acceso al Entrenador IA Forja habilitado.</span>
             </div>
             <button className="h-10 px-4 rounded-xl border border-white/20 text-white text-sm hover:bg-white hover:text-background transition-colors font-medium">
               Gestionar
             </button>
          </div>
        </motion.div>

        {/* CERRAR SESIÓN */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/5 text-red-400 font-bold border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </motion.div>

      </div>
    </div>
  );
}
