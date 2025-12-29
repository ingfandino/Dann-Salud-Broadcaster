/**
 * ============================================================
 * CLIENTE API (lib/api.ts)
 * ============================================================
 * Cliente Axios configurado con interceptores para auth.
 * Centraliza todas las llamadas al backend.
 */

'use client';

import axios, { AxiosInstance, AxiosError } from 'axios';

/* ========== CONFIGURACIÓN BASE ========== */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/* ========== INSTANCIA AXIOS ========== */
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/* Interceptor de request - agrega token de autenticación */
apiClient.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token && token !== 'null' && token !== 'undefined') {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/* Interceptor de response - maneja errores 401 */
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

/* ========== FUNCIONES DE API ========== */
export const api = {
    /* Jobs de Envío (Campañas) */
    sendJobs: {
        list: () => apiClient.get('/send-jobs'),
        get: (id: string) => apiClient.get(`/send-jobs/${id}`),
        start: (data: any) => apiClient.post('/send-jobs/start', data),
        pause: (id: string) => apiClient.post(`/send-jobs/${id}/pause`),
        resume: (id: string) => apiClient.post(`/send-jobs/${id}/resume`),
        cancel: (id: string) => apiClient.delete(`/send-jobs/${id}/cancel`),
        export: (id: string) => apiClient.get(`/send-jobs/${id}/export`, { responseType: 'blob' }),
        exportAutoResponses: (id: string) => apiClient.get(`/send-jobs/${id}/autoresponse-report`, { responseType: 'blob' }),
    },

    /* Auditorías */
    audits: {
        list: (params?: any) => apiClient.get('/audits', { params }),
        getByDate: (params?: any) => apiClient.get('/audits', { params }),
        getById: (id: string) => apiClient.get(`/audits/${id}`),
        create: (data: any) => apiClient.post('/audits', data),
        update: (id: string, data: any) => apiClient.patch(`/audits/${id}`, data),
        updateStatus: (id: string, data: any) => apiClient.patch(`/audits/${id}/status`, data),
        delete: (id: string) => apiClient.delete(`/audits/${id}`),
        uploadMultimedia: (id: string, formData: FormData) => apiClient.post(`/audits/${id}/multimedia`, formData),
        export: (params?: any) => apiClient.get('/audits/export', { params }),
        recalculateSupervisors: (data: { dateFrom?: string; dateTo?: string; onlyMissing?: boolean }) =>
            apiClient.post('/audits/recalculate-supervisors', data),
        bulkUpload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/audits/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        getAvailableSlots: (date: string) => apiClient.get('/audits/available-slots', { params: { date } }),
        getSalesStats: (date: string) => apiClient.get('/audits/sales-stats', { params: { date } }),
        getSupervisorStats: () => apiClient.get('/audits/stats/supervisors'),
        getObraSocialStats: () => apiClient.get('/audits/stats/obras-sociales'),
    },

    /* Recuperaciones */
    recovery: {
        list: (params?: any) => apiClient.get('/recovery', { params }),
        create: (data: any) => apiClient.post('/recovery', data),
        update: (id: string, data: any) => apiClient.put(`/recovery/${id}`, data),
        delete: (id: string) => apiClient.delete(`/recovery/${id}`),
    },

    /* Liquidación */
    liquidation: {
        list: (params?: any) => apiClient.get('/liquidacion', { params }),
        export: (params?: any) => apiClient.post('/liquidacion/export', params, { responseType: 'blob' }),
        exportDirect: (params?: any) => apiClient.post('/liquidacion/export-direct', params, { responseType: 'blob' }),
    },

    /* Empleados (RR.HH.) */
    employees: {
        list: () => apiClient.get('/employees'),
        get: (id: string) => apiClient.get(`/employees/${id}`),
        create: (data: any) => apiClient.post('/employees', data),
        update: (id: string, data: any) => apiClient.put(`/employees/${id}`, data),
        delete: (id: string) => apiClient.delete(`/employees/${id}`),
        toggleActive: (id: string) => apiClient.patch(`/employees/${id}/toggle-active`),
        uploadDNI: (file: File) => {
            const formData = new FormData();
            formData.append('fotoDNI', file);
            return apiClient.post('/employees/upload-dni', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
    },

    /* Usuarios */
    users: {
        list: (query?: string) => apiClient.get(`/users${query ? `?${query}` : ''}`),
        getSupervisors: () => apiClient.get('/users?role=supervisor'),
        get: (id: string) => apiClient.get(`/users/${id}`),
        create: (data: any) => apiClient.post('/users', data),
        update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
        delete: (id: string) => apiClient.delete(`/users/${id}`),
        changePassword: (id: string, data: any) => apiClient.put(`/users/${id}/password`, data),
        /* Gestión de Historial de Equipos */
        addTeamChange: (id: string, data: { nuevoEquipo: string; fechaInicio: string; notes?: string }) =>
            apiClient.post(`/users/${id}/team-change`, data),
        editTeamPeriod: (id: string, periodId: string, data: any) =>
            apiClient.put(`/users/${id}/team-history/${periodId}`, data),
        deleteTeamPeriod: (id: string, periodId: string) =>
            apiClient.delete(`/users/${id}/team-history/${periodId}`),
    },

    /* Grupos */
    groups: {
        list: () => apiClient.get('/groups'),
        get: (id: string) => apiClient.get(`/groups/${id}`),
        create: (data: any) => apiClient.post('/groups', data),
        update: (id: string, data: any) => apiClient.put(`/groups/${id}`, data),
        delete: (id: string) => apiClient.delete(`/groups/${id}`),
    },

    /* Afiliados */
    affiliates: {
        list: (params?: any) => apiClient.get('/affiliates', { params }),
        create: (data: any) => apiClient.post('/affiliates', data),
        update: (id: string, data: any) => apiClient.put(`/affiliates/${id}`, data),
        delete: (id: string) => apiClient.delete(`/affiliates/${id}`),
        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/affiliates/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        export: (params?: any) => apiClient.post('/affiliates/export', params, { responseType: 'blob' }),
        stats: () => apiClient.get('/affiliates/stats'),
        listExports: () => apiClient.get('/affiliates/exports'),
        downloadExport: (filename: string) => apiClient.get(`/affiliates/download-export/${filename}`, { responseType: 'blob' }),
        saveExportConfig: (config: any) => apiClient.post('/affiliates/export-config', config),
        getExportConfig: () => apiClient.get('/affiliates/export-config'),
        getObrasSociales: () => apiClient.get('/affiliates/obras-sociales'),
        /* Gestión de Leads */
        getFreshData: (params?: any) => apiClient.get('/affiliates/fresh-data', { params }),
        getReusableData: (params?: any) => apiClient.get('/affiliates/reusable', { params }),
        getFresh: () => apiClient.get('/affiliates/fresh'),
        distribute: (data: any) => apiClient.post('/affiliates/distribute', data),
        cancelExports: (type: 'today' | 'indefinite') => apiClient.post('/affiliates/cancel-exports', { type }),
        cleanupFresh: () => apiClient.post('/affiliates/cleanup-fresh'), // ✅ Limpiar datos frescos anteriores
        getAssigned: (params?: any) => apiClient.get('/affiliates/assigned', { params }),
        updateStatus: (id: string, data: any) => apiClient.put(`/affiliates/${id}/status`, data),
        getFailed: (params?: any) => apiClient.get('/affiliates/failed', { params }),
        getSupervisorStats: () => apiClient.get('/affiliates/supervisor-stats'),
    },



    /* Plantillas */
    templates: {
        list: () => apiClient.get('/templates'),
        get: (id: string) => apiClient.get(`/templates/${id}`),
        create: (data: any) => apiClient.post('/templates', data),
        update: (id: string, data: any) => apiClient.put(`/templates/${id}`, data),
        delete: (id: string) => apiClient.delete(`/templates/${id}`),
    },

    /* WhatsApp */
    whatsapp: {
        status: () => apiClient.get('/whatsapp/me/status'),
        qr: () => apiClient.get('/whatsapp/me/qr'),
        relink: () => apiClient.post('/whatsapp/me/relink'),
        logout: () => apiClient.post('/whatsapp/me/logout'),
    },

    /* Contactos */
    contacts: {
        upload: (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            return apiClient.post('/contacts/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        list: (params?: any) => apiClient.get('/contacts', { params }),
        downloadRejected: (logId: string) => apiClient.get(`/contacts/import-logs/${logId}/download-txt`, { responseType: 'blob' }),
    },

    /* Auto-respuestas */
    autoResponses: {
        list: () => apiClient.get('/autoresponses'),
        create: (data: any) => apiClient.post('/autoresponses', data),
        update: (id: string, data: any) => apiClient.put(`/autoresponses/${id}`, data),
        delete: (id: string) => apiClient.delete(`/autoresponses/${id}`),
        toggle: (id: string) => apiClient.patch(`/autoresponses/${id}/toggle`),
    },

    /* Mensajería Interna */
    internalMessages: {
        getInbox: (params?: any) => apiClient.get('/internal-messages/inbox', { params }),
        getSent: (params?: any) => apiClient.get('/internal-messages/sent', { params }),
        getStarred: (params?: any) => apiClient.get('/internal-messages/starred', { params }),
        getUnreadCount: () => apiClient.get('/internal-messages/unread-count'),
        getRecipients: (q?: string) => apiClient.get('/internal-messages/recipients', { params: { q } }),
        getById: (id: string) => apiClient.get(`/internal-messages/${id}`),
        send: (formData: FormData) => apiClient.post('/internal-messages', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
        delete: (id: string) => apiClient.delete(`/internal-messages/${id}`),
        deleteAll: () => apiClient.delete('/internal-messages'),
        toggleStarred: (id: string) => apiClient.patch(`/internal-messages/${id}/starred`),
        markAsRead: (id: string, read: boolean) => apiClient.patch(`/internal-messages/${id}/read`, { read }),
        downloadAttachment: (messageId: string, attachmentId: string) =>
            apiClient.get(`/internal-messages/${messageId}/attachments/${attachmentId}`, { responseType: 'blob' }),
    },

    /* Métricas */
    metrics: {
        dashboard: () => apiClient.get('/metrics/dashboard'),
        campaigns: (params?: any) => apiClient.get('/metrics/campaigns', { params }),
    },

    /* Mensajes */
    messages: {
        preview: (data: any) => apiClient.post('/messages/preview', data),
    },
    /* Palabras Prohibidas */
    bannedWords: {
        list: () => apiClient.get('/banned-words'),
        stats: () => apiClient.get('/banned-words/stats'),
        create: (data: any) => apiClient.post('/banned-words', data),
        update: (id: string, data: any) => apiClient.put(`/banned-words/${id}`, data),
        delete: (id: string) => apiClient.delete(`/banned-words/${id}`),
        detections: (params?: any) => apiClient.get('/banned-words/detections', { params }),
        resolveDetection: (id: string) => apiClient.put(`/banned-words/detections/${id}/resolve`),
    },

    /* Asignaciones */
    assignments: {
        distribute: (data: any) => apiClient.post('/assignments/distribute', data),
        getMyLeads: () => apiClient.get('/assignments/my-leads'),
        updateStatus: (id: string, data: any) => apiClient.patch(`/assignments/${id}/status`, data),
        logInteraction: (id: string, data: any) => apiClient.post(`/assignments/${id}/interaction`, data),
        sendWhatsApp: (id: string, data: { message: string, templateId?: string }) => apiClient.post(`/assignments/${id}/whatsapp`, data),
        reschedule: (id: string, data: { date: string, note?: string }) => apiClient.post(`/assignments/${id}/reschedule`, data),
        reassign: (id: string, data: { supervisorId: string, note?: string, scheduledHour?: string }) => apiClient.post(`/assignments/${id}/reassign`, data),
        exportMyLeads: () => apiClient.get('/assignments/my-leads/export', { responseType: 'blob' }),
    },

    /* Cliente raw para requests personalizados */
    client: apiClient,
};

/* Exportar API_URL para componentes que necesitan acceso directo */
export const API_URL = API_BASE_URL;

export default apiClient;
