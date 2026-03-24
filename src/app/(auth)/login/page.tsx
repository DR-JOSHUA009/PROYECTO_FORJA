"use client";

import AuthCard from "@/components/auth/AuthCard";
import PasswordInput from "@/components/auth/PasswordInput";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message === "Invalid login credentials" 
        ? "Credenciales denegadas por el sistema." 
        : authError.message);
      setIsLoading(false);
      return;
    }

    // El middleware detectará la cookie y permitirá la autorización
    router.push("/dashboard/home");
    router.refresh(); // Fuerza a Next.js a actualizar la vista de layout/SSR
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <AuthCard
        title="Acceso al Sistema"
        subtitle="Ingresa tus credenciales para reanudar tu planificación biológica."
        backLink="/"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-sm p-3 rounded-lg text-center font-mono">
              [ ERROR ]: {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-white text-xs uppercase tracking-widest font-mono">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-[#0e0e0e] text-white border border-white/20 focus:border-white rounded-xl px-4 text-sm outline-none transition-colors"
              placeholder="tu@email.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-white text-xs uppercase tracking-widest font-mono">Contraseña</label>
              <Link href="/forgot-password" className="text-text-secondary hover:text-white text-xs transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput 
              required 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-white text-background font-bold rounded-xl mt-2 hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Autenticando Red..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm">
          <span className="text-text-secondary">¿No tienes cuenta? </span>
          <Link href="/register" className="text-white hover:underline font-medium">
            Regístrate
          </Link>
        </div>
      </AuthCard>
    </div>
  );
}
