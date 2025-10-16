// frontend/src/services/jobService.js

import apiClient from "./api";
import logger from "../utils/logger";

export async function fetchJobs() {
    try {
        const res = await apiClient.get("/send-jobs");
        return res.data;
    } catch (err) {
        logger.error("❌ Error al obtener jobs:", err.response?.data || err);
        throw err;
    }
}

export async function createJob(data) {
    try {
        const res = await apiClient.post("/send-jobs/start", data);
        return res.data;
    } catch (err) {
        logger.error("❌ Error al crear job:", err.response?.data || err);
        throw err;
    }
}

export async function jobAction(id, action) {
    try {
        let res;
        if (action === "cancel") {
            // ahora es DELETE
            res = await apiClient.delete(`/send-jobs/${id}/cancel`);
        } else {
            const url = `/send-jobs/${id}/${action}`;
            res = await apiClient.post(url);
        }
        return res.data;
    } catch (err) {
        logger.error(`❌ Error en acción '${action}' para job ${id}:`, err.response?.data || err);
        throw err;
    }
}

export async function getJobById(id) {
    const res = await apiClient.get(`/send-jobs/${id}`);
    return res.data;
}

export async function exportJobResultsExcel(id) {
    const res = await apiClient.get(`/send-jobs/${id}/export`, {
        responseType: "blob",
    });
    return res.data;
}