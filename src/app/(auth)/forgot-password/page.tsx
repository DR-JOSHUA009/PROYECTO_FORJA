"use client";

import AuthCard from "@/components/auth/AuthCard";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const supabase = createClient();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      if (resetError.message.includes("Too many requests") || resetError.status === 429) {
        setError("Demasiados intentos. Espera un momento antes de volver a intentar.");
      } else if (resetError.message.includes("not found")) {
        setError("No encontramos ninguna cuenta con este correo.");
      } else {
        setError("Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo.");
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <AuthCard
        title="Recuperación de Llaves"
        subtitle="Te enviaremos un correo para recuperar tu contraseña."
        backLink="/login"
      >
        {!success ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs uppercase tracking-widest font-mono">Email Registrado</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-[#0e0e0e] text-white border border-white/20 focus:border-white rounded-xl px-4 text-sm outline-none transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center flex items-center gap-3">
                <span className="text-lg shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-white text-background font-bold rounded-xl mt-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  Procesando...
                </>
              ) : "Solicitar Reseteo"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="w-16 h-16 rounded-full glass border border-white/20 flex items-center justify-center mb-6 text-white">
              <Mail className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">¡Correo enviado!</h3>
            <p className="text-text-secondary text-sm mb-6">
              Revisa tu bandeja de correo (<span className="text-white font-mono">{email}</span>). Hemos enviado el enlace de recuperación.
            </p>
            <button 
              onClick={() => { setSuccess(false); setEmail(""); }}
              className="text-white text-sm hover:underline"
            >
              Probar con otro email
            </button>
          </div>
        )}
      </AuthCard>
    </div>
  );
}
