// frontend/src/services/messageService.js

import apiClient from "./api";

// Generar preview de mensaje con spintax
export async function previewMessage(data) {
    const res = await apiClient.post("/messages/preview", data);
    return res.data;
}

// Generar preview usando primer contacto importado
export async function previewMessageFromImport(data) {
    const res = await apiClient.post("/messages/previewFromImport", data);
    return res.data;
}