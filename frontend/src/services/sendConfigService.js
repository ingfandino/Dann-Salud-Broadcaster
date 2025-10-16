// frontend/src/services/sendConfigService.js

import apiClient from "./api";

// Obtener configuración de envíos
export async function fetchSendConfig() {
    const res = await apiClient.get("/send-config");
    return res.data;
}

// Actualizar configuración de envíos
export async function updateSendConfig(data) {
    const res = await apiClient.put("/send-config", data);
    return res.data;
}