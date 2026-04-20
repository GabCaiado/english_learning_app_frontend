import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabase, response } = updateSession(request)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const path = request.nextUrl.pathname

  // Se o usuário já estiver logado e tentar acessar a página de login, manda pro dashboard
  if (session && path === '/login') {
    return Response.redirect(new URL('/', request.url))
  }

  // Se o usuário NÃO estiver logado e tentar acessar qualquer outra página (que não seja login ou API), manda pro login
  if (!session && path !== '/login' && !path.startsWith('/api') && !path.startsWith('/_next')) {
    return Response.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
