import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

async function proxyRequest(
    request: NextRequest,
    method: string,
    path: string
): Promise<NextResponse> {
    try {
        const url = new URL(request.url);
        const backendUrl = `${BACKEND_URL}/api/${path}${url.search}`;


        const headers: HeadersInit = {};

        // Forward headers
        const authHeader = request.headers.get('Authorization');
        if (authHeader) headers['Authorization'] = authHeader;

        const contentType = request.headers.get('Content-Type');
        if (contentType) headers['Content-Type'] = contentType;

        // Forward Client IP and User Agent
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const ip = forwardedFor || realIp || '127.0.0.1';
        if (ip) headers['X-Forwarded-For'] = ip;

        const userAgent = request.headers.get('user-agent');
        if (userAgent) headers['User-Agent'] = userAgent;

        const options: RequestInit = {
            method,
            headers,
            // @ts-ignore - duplex is required for streaming bodies in fetch
            duplex: 'half',
        };

        // Pass body stream directly for methods that have body
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
            options.body = request.body;
        }

        const response = await fetch(backendUrl, options);

        // Get response content type
        const responseContentType = response.headers.get('content-type') || '';

        // Lista de content-types binarios que NO deben ser envueltos en JSON
        const binaryContentTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel
            'application/vnd.ms-excel', // Excel antiguo
            'application/pdf', // PDF
            'image/', // Cualquier imagen
            'application/octet-stream', // Binario genérico
            'application/zip', // ZIP
        ];

        // Si es un content-type binario, pasar la respuesta directamente
        const isBinary = binaryContentTypes.some(type => responseContentType.includes(type));

        if (isBinary) {
            // Pasar la respuesta binaria directamente sin modificar
            const blob = await response.blob();

            return new NextResponse(blob, {
                status: response.status,
                headers: {
                    'Content-Type': responseContentType,
                    'Content-Disposition': response.headers.get('Content-Disposition') || '',
                    'Content-Length': response.headers.get('Content-Length') || '',
                }
            });
        }

        // Para respuestas no-binarias, procesar como antes
        const text = await response.text();
        let data;

        if (!text || text.trim() === '') {
            data = { success: response.ok };
        } else if (responseContentType.includes('application/json')) {
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { message: text };
            }
        } else {
            data = { message: text };
        }

        return NextResponse.json(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error: any) {
        console.error(`API Proxy Error [${method} ${path}]:`, error.message);
        return NextResponse.json(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, 'GET', path.join('/'));
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, 'POST', path.join('/'));
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, 'PUT', path.join('/'));
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, 'PATCH', path.join('/'));
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    return proxyRequest(request, 'DELETE', path.join('/'));
}
