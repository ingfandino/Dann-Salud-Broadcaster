// frontend/src/services/authService.js

import apiClient from "./api";
import logger from "../utils/logger";

// Registrar usuario
export async function register(data) {
    const res = await apiClient.post("/auth/register", data);
    return res.data;
}

// Iniciar sesión
export async function login({ email, password }) {
    const res = await apiClient.post("/auth/login", { email, password });

    if (res.data.token) {
        localStorage.setItem("token", res.data.token);
    }

    return res.data;
}

// Cerrar sesión
export function logout() {
    localStorage.removeItem("token");
    delete apiClient.defaults.headers.common["Authorization"];
    window.location.href = "/login";
}

// Obtener usuario autenticado
export async function getMe() {
    const res = await apiClient.get("/auth/me");
    return res.data?.user;
}