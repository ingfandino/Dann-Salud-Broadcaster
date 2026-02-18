/**
 * ============================================================
 * STORE DE AUTENTICACIÓN (lib/auth.ts)
 * ============================================================
 * Estado global de autenticación usando Zustand.
 * Persiste token y usuario en localStorage.
 */

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Estructura del usuario autenticado */
interface User {
    _id: string;
    nombre: string;
    email: string;
    role: string;
    numeroEquipo?: string;
    active?: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<any>;
    register: (data: any) => Promise<void>;
    recoverPassword: (email: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User, token: string) => void;
    updateUser: (user: Partial<User>) => void;
}

export const useAuth = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Login failed');
                    }

                    const data = await response.json();

                    // Store token in localStorage for socket auth
                    localStorage.setItem('token', data.token);

                    // Store token in cookie for middleware auth
                    document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;

                    set({
                        user: data.user,
                        token: data.token,
                        isAuthenticated: true
                    });

                    return data; // Return data for redirect logic
                } catch (error: any) {
                    console.error('Login error:', error);
                    throw error;
                }
            },

            register: async (userData: any) => {
                try {
                    const response = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userData),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || error.errors?.[0] || 'Error en el registro');
                    }

                    // Opcional: Auto-login tras registro o redirigir a login
                } catch (error: any) {
                    console.error('Register error:', error);
                    throw error;
                }
            },

            recoverPassword: async (email: string) => {
                try {
                    const response = await fetch('/api/auth/forgot-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.message || 'Error al solicitar recuperación');
                    }
                } catch (error: any) {
                    console.error('Recover password error:', error);
                    throw error;
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                // Clear cookie
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                set({ user: null, token: null, isAuthenticated: false });
            },

            setUser: (user: User, token: string) => {
                localStorage.setItem('token', token);
                set({ user, token, isAuthenticated: true });
            },

            updateUser: (userData: Partial<User>) => {
                const currentUser = get().user;
                if (currentUser) {
                    set({ user: { ...currentUser, ...userData } });
                }
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);

// ✅ Helper para verificar si el usuario tiene nivel de supervisor (incluye encargado)
export const isSupervisorLevel = (role?: string): boolean => {
    if (!role) return false;
    const normalizedRole = role.toLowerCase();
    return normalizedRole === 'supervisor' || normalizedRole === 'encargado';
};

// ✅ Helper para verificar si el usuario puede editar auditorías (gerencia, auditor, supervisor, encargado)
export const canEditAudits = (role?: string): boolean => {
    if (!role) return false;
    const normalizedRole = role.toLowerCase();
    return ['gerencia', 'auditor', 'supervisor', 'encargado'].includes(normalizedRole);
};

// ✅ Helper para verificar si el usuario puede eliminar (solo gerencia)
export const canDelete = (role?: string): boolean => {
    if (!role) return false;
    return role.toLowerCase() === 'gerencia';
};
