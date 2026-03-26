"use client";

import { motion } from "framer-motion";
import { Settings, Shield, Bell, CreditCard, ChevronRight, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Icon3D } from "@/components/ui/Icon3D";
import { useToast } from "@/components/ui/Toast";

export default function SettingsModule() {
  const [userEmail, setUserEmail] = useState<string>("Cargando...");
  const [userPlan, setUserPlan] = useState<string>("free");
  const [secretCode, setSecretCode] = useState<string>("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "Sin email");
        const { data: pData } = await supabase.from("users_profile").select("plan").eq("user_id", user.id).single();
        if (pData?.plan) setUserPlan(pData.plan);
      }
    }
    loadUser();
  }, [supabase]);

  const handleUpgrade = async () => {
    if (!secretCode) return;
    setIsUpgrading(true);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        body: JSON.stringify({ code: secretCode.trim() }),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (res.ok) {
        setUserPlan("pro");
        setSecretCode("");
        toast("💎 " + data.message, "success");
      } else {
        toast("❌ " + data.error, "error");
      }
    } catch (err) {
      toast("Error al procesar el código", "error");
    } finally {
      setIsUpgrading(false);
    }
  };

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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`glass rounded-2xl border overflow-hidden ${userPlan === 'pro' ? 'border-[#eab308]/50 shadow-[0_0_20px_rgba(234,179,8,0.15)] bg-gradient-to-r from-[#eab308]/5 to-transparent' : 'border-white/5'}`}>
          <div className="p-4 border-b border-white/5 bg-white/2">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Icon3D icon={CreditCard} color={userPlan === 'pro' ? '#eab308' : '#ffffff'} size={18} /> Suscripción
            </h2>
          </div>
          <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="flex flex-col gap-1">
               <span className={`text-lg font-bold flex items-center gap-2 ${userPlan === 'pro' ? 'text-[#eab308]' : 'text-white'}`}>
                 {userPlan === 'pro' ? '👑 FORJA PRO Activo' : 'Versión Limitada (FREE)'}
               </span>
               <span className="text-sm text-text-secondary">
                 {userPlan === 'pro' ? 'Acceso ilimitado al Agente IA, Análisis de Sueño y Tendencias desbloqueados.' : 'Límite de 10 mensajes diarios. Mejoras avanzadas bloqueadas.'}
               </span>
             </div>
             {userPlan !== 'pro' && (
               <div className="flex gap-2 w-full md:w-auto">
                 <input 
                   type="text" 
                   placeholder="Código secreto" 
                   value={secretCode}
                   onChange={(e) => setSecretCode(e.target.value.toUpperCase())}
                   className="h-10 px-4 rounded-xl bg-black border border-white/10 text-white text-sm outline-none focus:border-[#eab308] transition-colors uppercase w-full md:w-40"
                 />
                 <button 
                   onClick={handleUpgrade}
                   disabled={isUpgrading}
                   className="h-10 px-4 rounded-xl border border-[#eab308]/50 text-[#eab308] text-sm hover:bg-[#eab308] hover:text-black transition-colors font-bold whitespace-nowrap disabled:opacity-50"
                 >
                   {isUpgrading ? "..." : "Canjear"}
                 </button>
               </div>
             )}
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
