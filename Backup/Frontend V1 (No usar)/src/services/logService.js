// frontend/src/services/logService.js

import apiClient from "./api";

// Obtener lista de logs con filtros
export async function fetchLogs({ tipo, from, to, limit } = {}) {
    const params = {};
    if (tipo) params.tipo = tipo;
    if (from) params.from = from;
    if (to) params.to = to;
    if (limit) params.limit = limit;

    const res = await apiClient.get("/logs", { params });
    return res.data;
}

// Exportar logs (json, csv, excel)
export async function exportLogs(format = "json") {
    const res = await apiClient.get(`/logs/export/${format}`, {
        responseType: "blob",
    });

    // Crear descarga automática
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `logs.${format === "excel" ? "xlsx" : format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}