import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // El proxy de Supabase manejará la actualización de cookies y protección de rutas
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Funciona para todas las rutas menos estáticos y _next.
     * Configuración oficial de Supabase para App Router SSR auth.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
