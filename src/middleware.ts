import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // --- 1. Sin sesión: bloquear dashboard y onboarding ---
  if (!user) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // --- 2. Con sesión: redirigir fuera de login/register ---
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.redirect(new URL('/dashboard/home', request.url))
  }

  // --- 3. Con sesión: verificar si completó onboarding ---
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    const { data: profile } = await supabase
      .from('users_profile')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    const onboardingDone = profile?.onboarding_completed === true

    // Si NO completó onboarding y quiere entrar al dashboard → forzar onboarding
    if (!onboardingDone && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // Si YA completó onboarding y quiere volver a /onboarding → mandarlo al dashboard
    if (onboardingDone && pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/dashboard/home', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
