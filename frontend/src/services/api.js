// frontend/src/services/api.js

import axios from "axios";
import logger from "../utils/logger";
import { API_URL } from "../config";

logger.info("🌍 VITE_API_URL cargado:", import.meta.env.VITE_API_URL);

const apiClient = axios.create({
    baseURL: API_URL,
});

// Interceptor de request: añade token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token && token !== "null" && token !== "undefined") {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de response: maneja 401
apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            if (!window.location.pathname.includes("/login")) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

// --- Export por defecto y utilidades auxiliares ---
// export por defecto para uso general
export default apiClient;

// función para comprobar estado del whatsapp (teléfono vinculado)
export async function getWhatsappStatus() {
    const res = await apiClient.get("/whatsapp/me/status");
    return res.data;
}

// función para desconectar el dispositivo (logout del cliente de WhatsApp)
let logoutInFlightPromise = null;
export async function logoutWhatsapp() {
    if (logoutInFlightPromise) {
        return logoutInFlightPromise;
    }
    logoutInFlightPromise = apiClient
        .post("/whatsapp/me/logout")
        .then((res) => res.data)
        .finally(() => {
            logoutInFlightPromise = null;
        });
    return logoutInFlightPromise;
}