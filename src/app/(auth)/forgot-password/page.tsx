"use client";

import AuthCard from "@/components/auth/AuthCard";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulando Supabase email send
    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <AuthCard
        title="Recuperación de Llaves"
        subtitle="Si tu identidad física se ha perdido, enviaremos un código de restauración de parámetros."
        backLink="/login"
      >
        {!success ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs uppercase tracking-widest font-mono">Email Registrado</label>
              <input
                type="email"
                required
                className="w-full h-12 bg-[#0e0e0e] text-white border border-white/20 focus:border-white rounded-xl px-4 text-sm outline-none transition-colors"
                placeholder="Identificador del sistema (ej. tu@email.com)"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-white text-background font-bold rounded-xl mt-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Procesando..." : "Solicitar Reseteo"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="w-16 h-16 rounded-full glass border border-white/20 flex items-center justify-center mb-6 text-white">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Señal Emitida</h3>
            <p className="text-text-secondary text-sm mb-6">
              Revisa tu terminal de entrada (Bandeja de correo). Hemos enviado el paquete de recuperación.
            </p>
            <button 
              onClick={() => setSuccess(false)}
              className="text-white text-sm hover:underline"
            >
              Probar de nuevo
            </button>
          </div>
        )}
      </AuthCard>
    </div>
  );
}
