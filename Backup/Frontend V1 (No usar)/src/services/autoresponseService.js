// frontend/src/services/autoresponseService.js

import apiClient from "./api";

// Obtener todas las autorespuestas
export async function fetchAutoresponses() {
    const res = await apiClient.get("/autoresponses");
    return res.data;
}

// Crear nueva autorespuesta
export async function createAutoresponse(data) {
    const res = await apiClient.post("/autoresponses", data);
    return res.data;
}

// Actualizar autorespuesta
export async function updateAutoresponse(id, data) {
    const res = await apiClient.put(`/autoresponses/${id}`, data);
    return res.data;
}

// Eliminar autorespuesta
export async function deleteAutoresponse(id) {
    const res = await apiClient.delete(`/autoresponses/${id}`);
    return res.data;
}