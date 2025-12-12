'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ['polling', 'websocket'],  // ✅ Polling first for reliability
            upgrade: true,  // Allow upgrade to WebSocket after polling establishes
            timeout: 10000,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            // Auth will be set when connecting, not here
        });

        // ✅ Comprehensive debug logs
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
        // ✅ Set auth token before connecting
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

// Export socket instance for direct use
// Export socket instance for direct use
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
