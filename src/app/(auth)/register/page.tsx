"use client";

import AuthCard from "@/components/auth/AuthCard";
import PasswordInput from "@/components/auth/PasswordInput";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password !== confirmValue) {
      setError("Las contraseñas no coinciden. Verifica e intenta de nuevo.");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setIsLoading(false);
      return;
    }

    // 1. Crear el usuario en auth.users de Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      }
    });

    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
        setError("Este correo ya tiene una cuenta. Intenta iniciar sesión.");
      } else if (authError.message.includes("valid email") || authError.message.includes("invalid")) {
        setError("El correo ingresado no es válido. Revisa el formato.");
      } else if (authError.message.includes("Too many requests") || authError.status === 429) {
        setError("Demasiados intentos. Espera un momento antes de volver a intentar.");
      } else if (authError.message.includes("weak password") || authError.message.includes("password")) {
        setError("La contraseña no cumple los requisitos mínimos de seguridad.");
      } else {
        setError("Ocurrió un error al crear la cuenta. Inténtalo de nuevo.");
      }
      setIsLoading(false);
      return;
    }

    // 2. Verificar si se inició sesión automáticamente (Email Confirmations OFF)
    if (authData.session) {
      router.push("/onboarding");
    } else {
      // Email Confirmations ON
      setSuccess("¡Cuenta creada con éxito! Revisa tu bandeja de correo para confirmar tu cuenta antes de iniciar sesión.");
      setIsLoading(false);
    }
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <AuthCard
        title="Inicializar Perfil"
        subtitle="Crea tu cuenta para armar tu plan personalizado."
        backLink="/"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-xl text-center flex items-center gap-3">
              <span className="text-lg shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm p-4 rounded-xl text-center flex items-center gap-3">
              <span className="text-lg shrink-0">✅</span>
              <span>{success}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-white text-xs uppercase tracking-widest font-mono">Email</label>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 bg-[#0e0e0e] text-white border border-white/20 focus:border-white rounded-xl px-4 text-sm outline-none transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white text-xs uppercase tracking-widest font-mono">Contraseña</label>
            <PasswordInput 
              name="password" 
              required 
              placeholder="Mínimo 8 caracteres" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-white text-xs uppercase tracking-widest font-mono">Confirmar Contraseña</label>
            <PasswordInput 
              name="confirm" 
              required 
              placeholder="Verifica la secuencia" 
              value={confirmValue}
              onChange={e => setConfirmValue(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-white text-background font-bold rounded-xl mt-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creando cuenta..." : "Crear Perfil"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm">
          <span className="text-text-secondary">¿Ya estás en el sistema? </span>
          <Link href="/login" className="text-white hover:underline font-medium">
            Inicia Sesión
          </Link>
        </div>
      </AuthCard>
    </div>
  );
}
