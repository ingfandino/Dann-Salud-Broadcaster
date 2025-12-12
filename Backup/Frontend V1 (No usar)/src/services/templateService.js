// frontend/src/services/templateService.js

import apiClient from "./api";

// Obtener todas las plantillas
export async function fetchTemplates() {
    const res = await apiClient.get("/templates");
    return res.data;
}

// Crear nueva plantilla
export async function createTemplate(data) {
    const res = await apiClient.post("/templates", data);
    return res.data;
}

// Actualizar plantilla existente
export async function updateTemplate(id, data) {
    const res = await apiClient.put(`/templates/${id}`, data);
    return res.data;
}

// Eliminar plantilla
export async function deleteTemplate(id) {
    const res = await apiClient.delete(`/templates/${id}`);
    return res.data;
}