"use client";

import AuthCard from "@/components/auth/AuthCard";
import { FormEvent, useState } from "react";
import { Lock, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      if (updateError.message.includes("same password") || updateError.message.includes("different")) {
        setError("La nueva contraseña debe ser diferente a la actual.");
      } else if (updateError.message.includes("expired") || updateError.status === 401) {
        setError("El enlace de recuperación ha expirado. Solicita uno nuevo.");
      } else {
        setError("Ocurrió un error al actualizar la contraseña. Inténtalo de nuevo.");
      }
      setIsLoading(false);
    } else {
      setSuccess(true);
      setIsLoading(false);
      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        router.push("/dashboard/home");
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <AuthCard
        title="Nueva Contraseña"
        subtitle="Establece tu nueva contraseña de acceso."
        backLink="/login"
      >
        {!success ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs uppercase tracking-widest font-mono">Nueva Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-[#0e0e0e] text-white border border-white/20 focus:border-white rounded-xl pl-11 pr-4 text-sm outline-none transition-colors"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-white text-xs uppercase tracking-widest font-mono">Confirmar Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 bg-[#0e0e0e] text-white border border-white/20 focus:border-white rounded-xl pl-11 pr-4 text-sm outline-none transition-colors"
                  placeholder="Repetir contraseña"
                />
              </div>
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
                  Actualizando...
                </>
              ) : "Actualizar Contraseña"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Contraseña Actualizada</h3>
            <p className="text-text-secondary text-sm mb-2">
              Tu contraseña ha sido cambiada exitosamente.
            </p>
            <p className="text-text-muted text-xs font-mono">
              Redirigiendo al dashboard...
            </p>
          </div>
        )}
      </AuthCard>
    </div>
  );
}
