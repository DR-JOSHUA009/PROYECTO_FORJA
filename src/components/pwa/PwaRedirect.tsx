"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PwaRedirect() {
  const router = useRouter();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si está en modo PWA App (Standalone)
    const checkIsStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    if (checkIsStandalone) {
      setIsStandalone(true); // Dispara el overlay oscuro para tapar la landing
      
      // Chequeo asíncrono de sesión usando Supabase Client
      const checkSession = async () => {
        const supabase = createClient();
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace("/dashboard/home");
          } else {
            router.replace("/login");
          }
        } catch (error) {
          console.error("Error validando sesión PWA:", error);
          router.replace("/login");
        }
      };

      checkSession();
    }
  }, [router]);

  // Si no está instalada como PWA nativa, no devolvemos nada, se ve la landing fluida.
  if (!isStandalone) return null;

  // Si está como PWA, cubrimos todo con el background de Forja para que parezca el "Splash Screen" Nativo
  // y evitar el feo parpadeo de las hero sections de marketing en la app instalada.
  return (
    <div className="fixed inset-0 z-[99999] bg-background flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <span className="text-white/30 font-mono text-xs mt-6 tracking-widest uppercase animate-pulse">
        Entrando a la Forja
      </span>
      {/* CSS extra para bloquear el scroll de la página de fondo */}
      <style>{`body { overflow: hidden !important; }`}</style>
    </div>
  );
}
