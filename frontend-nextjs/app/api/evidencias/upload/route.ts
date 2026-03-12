/**
 * ============================================================
 * RUTA DEDICADA: Upload de Evidencias (ZIP hasta 100MB)
 * ============================================================
 * Esta ruta maneja específicamente la subida de archivos ZIP
 * de evidencias, bypaseando el catch-all proxy genérico para
 * evitar limitaciones de tamaño de body en Next.js.
 *
 * Flujo: Browser → Next.js (esta ruta) → Express backend :5001
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// ✅ Timeout extendido para uploads grandes (2 minutos)
export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const backendUrl = `${BACKEND_URL}/api/evidencias/upload`;

        // Construir headers para el proxy
        const headers: HeadersInit = {};

        // Forward Authorization
        const authHeader = request.headers.get('Authorization');
        if (authHeader) headers['Authorization'] = authHeader;

        // Forward Content-Type (incluye boundary para multipart/form-data)
        const contentType = request.headers.get('Content-Type');
        if (contentType) headers['Content-Type'] = contentType;

        // Forward Content-Length (crítico para uploads grandes)
        const contentLength = request.headers.get('Content-Length');
        if (contentLength) headers['Content-Length'] = contentLength;

        // Forward Client IP
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ip = forwardedFor || realIp || '127.0.0.1';
        headers['X-Forwarded-For'] = ip;

        // Forward User-Agent
        const userAgent = request.headers.get('user-agent');
        if (userAgent) headers['User-Agent'] = userAgent;

        // Proxy la request al backend, streaming el body directamente
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers,
            body: request.body,
            // @ts-ignore - duplex requerido para streaming de bodies en fetch
            duplex: 'half',
        });

        // Leer respuesta del backend
        const responseContentType = response.headers.get('content-type') || '';

        if (responseContentType.includes('application/json')) {
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }
            return NextResponse.json(data, { status: response.status });
        }

        // Respuesta no-JSON (poco probable para upload)
        const text = await response.text();
        return NextResponse.json(
            { ok: response.ok, message: text || 'Upload procesado' },
            { status: response.status }
        );

    } catch (error: any) {
        console.error('[EVIDENCIAS-UPLOAD-PROXY] Error:', error.message);

        // Diferenciar tipos de error para mensajes más claros
        if (error.message?.includes('ECONNRESET') || error.message?.includes('socket hang up')) {
            return NextResponse.json(
                {
                    ok: false,
                    message: 'La conexión se interrumpió durante la subida. Intente nuevamente.',
                    error: error.message,
                },
                { status: 502 }
            );
        }

        if (error.message?.includes('ECONNREFUSED')) {
            return NextResponse.json(
                {
                    ok: false,
                    message: 'No se pudo conectar con el servidor. Intente nuevamente.',
                    error: error.message,
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            {
                ok: false,
                message: 'Error al subir el archivo de evidencia',
                error: error.message,
            },
            { status: 500 }
        );
    }
}
