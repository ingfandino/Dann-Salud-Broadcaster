/**
 * ============================================================
 * MIDDLEWARE DE AUTENTICACIÓN (middleware.ts)
 * ============================================================
 * Protege rutas que requieren autenticación.
 * Redirige a /login si no hay token válido.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/* Rutas que no requieren autenticación */
const publicRoutes = ['/login', '/', '/register', '/recover'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    /* Permitir rutas públicas */
    if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/recover')) {
        return NextResponse.next();
    }

    /* Verificar token de auth en cookies o headers */
    const token = request.cookies.get('token')?.value ||
        request.headers.get('Authorization')?.replace('Bearer ', '');

    /* Redirigir a login si no hay token */
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

/* Configurar qué rutas usan este middleware */
export const config = {
    matcher: [
        /*
         * Coincide con todas las rutas excepto:
         * - rutas api (manejadas separadamente)
         * - _next/static (archivos estáticos)
         * - _next/image (optimización de imágenes)
         * - favicon.ico
         * - archivos públicos
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
