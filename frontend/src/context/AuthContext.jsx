// frontend/src/context/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/api";
import socket from "../services/socket";
import logger from "../utils/logger";
import {
    login as loginApi,
    register as registerApi,
    logout as logoutApi,
    getMe,
} from "../services/authService";

// Usamos la instancia compartida desde services/socket

const AuthContext = createContext();

function sanitizeTokenFromStorage() {
    const t = localStorage.getItem("token");
    if (!t || t === "null" || t === "undefined") return null;
    return t;
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => sanitizeTokenFromStorage());
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const logout = () => {
        logoutApi();
        setToken(null);
        setUser(null);
        try { localStorage.removeItem("user"); } catch {}
        socket.auth = {}; // Limpiar el token del socket, pero no desconectar
        navigate("/login", { replace: true });
    };

    // Interceptor 401: solo desloguear si falla /auth/me
    useEffect(() => {
        const interceptor = apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error?.response?.status;
                const url = error?.config?.url || "";
                if (status === 401 && user && /\/auth\/me\b/.test(url)) {
                    toast.error("Tu sesión ha expirado. Por favor, inicia sesión de nuevo.");
                    logout();
                }
                return Promise.reject(error);
            }
        );
        return () => apiClient.interceptors.response.eject(interceptor);
    }, [user]);

    // Sincronizar token con localStorage y socket.auth
    useEffect(() => {
        if (token) {
            localStorage.setItem("token", token);
            socket.auth = { token };
            // Conectar socket si no está conectado
            try {
                if (!socket.connected) socket.connect();
                // Exponer socket globalmente para notificaciones
                window.socket = socket;
            } catch {}
        } else {
            localStorage.removeItem("token");
            socket.auth = {};
            // Desconectar socket si estaba conectado
            try {
                if (socket.connected) socket.disconnect();
                window.socket = null;
            } catch {}
        }
    }, [token]);

    const login = async (email, password) => {
        try {
            const { token: newToken, user } = await loginApi({ email, password });
            if (user.role !== "admin" && !user.active) {
                return { ok: false, msg: "Tu cuenta está pendiente de activación." };
            }
            setToken(newToken);
            setUser(user);
            try { localStorage.setItem("user", JSON.stringify(user)); } catch {}
            navigate("/", { replace: true });
            return { ok: true };
        } catch (err) {
            return { ok: false, msg: err.response?.data?.error || "Credenciales inválidas" };
        }
    };

    const register = async (data) => {
        try {
            const res = await registerApi(data);
            return { ok: true, msg: res.message || "Registro exitoso" };
        } catch (err) {
            const data = err.response?.data;
            let msg = "No se pudo registrar";
            if (data?.error) msg = data.error;
            else if (Array.isArray(data?.errors)) msg = data.errors.join(", ");
            return { ok: false, msg };
        }
    };

    // Verificar token con backend al montar la app
    useEffect(() => {
        let mounted = true;
        async function verify() {
            const t = sanitizeTokenFromStorage();
            if (!t) {
                setLoading(false);
                return;
            }
            try {
                const me = await getMe();
                if (!mounted) return;
                setUser(me || null);
                setToken(t);
                try { localStorage.setItem("user", JSON.stringify(me || null)); } catch {}
            } catch (err) {
                // Solo cerrar sesión si el backend confirma 401
                const status = err?.response?.status;
                if (mounted) {
                    if (status === 401) {
                        setToken(null);
                        setUser(null);
                        try { localStorage.removeItem("user"); } catch {}
                    } else {
                        // Mantener sesión ante fallos de red/CORS/timeouts
                        // Evitar flicker de logout por errores transitorios
                        // Opcional: logger.warn
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }
        verify();
        return () => { mounted = false; };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                login,
                logout,
                register,
                setUser,
                loading,
                socket, // Pasamos la instancia única
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}