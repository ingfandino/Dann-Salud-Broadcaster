/**
 * ============================================================
 * CLIENTE SOCKET.IO (lib/socket.ts)
 * ============================================================
 * Conexión WebSocket para eventos en tiempo real.
 * Maneja reconexiones y autenticación automática.
 */

'use client';

import { io, Socket } from 'socket.io-client';

function getSocketUrl() {
  const defaultSocketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const tunnelSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL_TUNNEL;

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    if ((protocol === 'https:' || hostname.endsWith('.trycloudflare.com')) && tunnelSocketUrl) {
      return tunnelSocketUrl;
    }
  }

  return defaultSocketUrl;
}

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['polling', 'websocket'],  /* Polling primero para mayor confiabilidad */
            upgrade: true,  /* Permite upgrade a WebSocket después de establecer polling */
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            /* Auth se configura al conectar, no aquí */
        });

        /* Logs de depuración */
        socket.on('connect', () => {
            console.log('✅ Socket conectado:', socket?.id);
            console.log('[Socket] Transport:', socket?.io?.engine?.transport?.name);
            console.log('[Socket] URL:', SOCKET_URL);
        });

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket desconectado:', reason);
            console.log('[Socket] Disconnect details:', {
                connected: socket?.connected,
                id: socket?.id,
                transport: socket?.io?.engine?.transport?.name
            });
        });

        socket.on('connect_error', (err: Error & { description?: unknown; type?: string; context?: unknown }) => {
            console.error('❌ Error de conexión de Socket:', err.message);
            console.error('[Socket] Error details:', {
                type: err.type,
                description: err.description,
                context: err.context
            });
        });

        socket.on('error', (err) => {
            console.error('❌ Socket error:', err);
        });

        socket.io.on('reconnect', (attempt) => {
            console.log(`🔄 Socket reconectado después de ${attempt} intentos`);
        });

        socket.io.on('reconnect_error', (err) => {
            console.error('❌ Error de reconexión:', err.message);
        });

        socket.io.on('reconnect_failed', () => {
            console.error('❌ Reconexión fallida - máximo de intentos alcanzado');
        });
    }
    return socket;
}

export function connectSocket(): Socket {
    const socket = getSocket();
    if (!socket.connected) {
        /* Configurar token de auth antes de conectar */
        const token = localStorage.getItem('token');
        if (token) {
            socket.auth = { token };
            console.log('[Socket] Conectando con token de autenticación');
        } else {
            console.warn('[Socket] Conectando sin token de autenticación');
        }
        socket.connect();
    }
    return socket;
}

export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}

/* Exportar instancia de socket para uso directo */
export { socket };

import { useEffect, useState } from 'react';

export function useSocket() {
    const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

    useEffect(() => {
        const socket = connectSocket();
        setSocketInstance(socket);
    }, []);

    return socketInstance;
}
