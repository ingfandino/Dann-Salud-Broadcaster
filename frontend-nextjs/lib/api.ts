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

/* Interceptor de response - maneja errores 401 y 403 (suspensión) */
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ code?: string; message?: string; suspensionEnd?: string }>) => {
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        }

        // ✅ Manejo de suspensión de cuenta
        if (error.response?.status === 403 && error.response?.data?.code === 'ACCOUNT_SUSPENDED') {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('auth-storage');
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

                const message = error.response.data.message || 'Tu cuenta se encuentra suspendida temporalmente.';
                // Guardar mensaje para mostrar en login
                sessionStorage.setItem('suspensionMessage', message);

                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?suspended=true';
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
        bulkImport: (data: { records: any[] }) => apiClient.post('/audits/bulk-import', data),
        getAvailableSlots: (date: string) => apiClient.get('/audits/available-slots', { params: { date } }),
        getSalesStats: (date: string) => apiClient.get('/audits/sales-stats', { params: { date } }),
        getSupervisorStats: () => apiClient.get('/audits/stats/supervisors'),
        getObraSocialStats: () => apiClient.get('/audits/stats/obras-sociales'),
        markRevision: (id: string, data: { lista_para_reventa?: boolean }) =>
            apiClient.patch(`/audits/${id}/revision`, data),
        getReventa: () => apiClient.get('/audits/reventa'),
        exportReventa: () => apiClient.get('/audits/reventa/export', { responseType: 'blob' }),
        toggleEnProceso: (id: string) => apiClient.patch(`/audits/${id}/toggle-en-proceso`),
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
        listByTipo: (params?: any) => apiClient.get('/liquidacion/by-tipo', { params }),
        statsMonthly: (params?: any) => apiClient.get('/liquidacion/stats-monthly', { params }),
        calculateSalary: (params?: any) => apiClient.get('/liquidacion/salary-calculation', { params }),
        export: (params?: any) => apiClient.post('/liquidacion/export', params, { responseType: 'blob' }),
        exportDirect: (params?: any) => apiClient.post('/liquidacion/export-direct', params, { responseType: 'blob' }),
    },

    /* Empleados (RR.HH.) */
    employees: {
        list: () => apiClient.get('/employees'),
        get: (id: string) => apiClient.get(`/employees/${id}`),
        create: (data: any) => apiClient.post('/employees', data),
        update: (id: string, data: any) => apiClient.put(`/employees/${id}`, data),
        deactivate: (id: string, data: { motivoBaja: string; fechaEgreso: string; motivoBajaNormalizado?: string | null }) =>
            apiClient.put(`/employees/${id}/deactivate`, data),
        reactivate: (id: string) => apiClient.put(`/employees/${id}/reactivate`),
        delete: (id: string) => apiClient.delete(`/employees/${id}`),
        uploadDNI: (file: File) => {
            const formData = new FormData();
            formData.append('fotoDNI', file);
            return apiClient.post('/employees/upload-dni', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        getIngreso: (userId: string) => apiClient.get(`/employees/user/${userId}/ingreso`),
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
        /* Suspensión temporal de cuentas */
        suspend: (id: string, data: { suspensionStart: string; suspensionEnd: string }) =>
            apiClient.post(`/users/${id}/suspend`, data),
        cancelSuspension: (id: string) =>
            apiClient.delete(`/users/${id}/suspend`),
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
        getImportJob: (jobId: string) => apiClient.get('/affiliates/import-jobs/' + jobId),
        downloadImportRejected: (jobId: string) => apiClient.get('/affiliates/import-jobs/' + jobId + '/rejected-file', { responseType: 'blob' }),
        downloadImportUpdated: (jobId: string) => apiClient.get('/affiliates/import-jobs/' + jobId + '/updated-file', { responseType: 'blob' }),
        export: (params?: any) => apiClient.post('/affiliates/export', params, { responseType: 'blob' }),
        baseStatus: () => apiClient.get('/affiliates/base-status'),
        stats: () => apiClient.get('/affiliates/stats'),
        listExports: () => apiClient.get('/affiliates/exports'),
        downloadExport: (filename: string) => apiClient.get(`/affiliates/download-export/${filename}`, { responseType: 'blob' }),
        saveExportConfig: (config: any) => apiClient.post('/affiliates/export-config', config),
        getExportConfig: () => apiClient.get('/affiliates/export-config'),
        getObrasSociales: () => apiClient.get('/affiliates/obras-sociales'),
        getStockByObraSocial: (obraSocial: string) => apiClient.get(`/affiliates/stock-by-obra-social?obraSocial=${encodeURIComponent(obraSocial)}`),
        check: {
            getConfig: () => apiClient.get('/affiliates/check/config'),
            getObraSocialAvailability: (payload: { mode: 'check_new' | 'check_reusable'; search?: string; limit?: number; selectedCodes?: number[] }) =>
                apiClient.post('/affiliates/check/obra-social-availability', payload),
            preview: (payload: any) => apiClient.post('/affiliates/check/preview', payload),
            createJob: (payload: any) => apiClient.post('/affiliates/check/jobs', payload),
            listJobs: (params?: any, config?: any) => apiClient.get('/affiliates/check/jobs', { ...config, params }),
            getJob: (jobId: string) => apiClient.get(`/affiliates/check/jobs/${jobId}`),
            cancelJob: (jobId: string, data?: any) => apiClient.post(`/affiliates/check/jobs/${jobId}/cancel`, data || {}),
            processJob: (jobId: string) => apiClient.post(`/affiliates/check/jobs/${jobId}/process`),
            pauseJob: (jobId: string, data?: any) => apiClient.post(`/affiliates/check/jobs/${jobId}/pause`, data || {}),
            resumeJob: (jobId: string) => apiClient.post(`/affiliates/check/jobs/${jobId}/resume`),
            retryJob: (jobId: string, data?: any) => apiClient.post(`/affiliates/check/jobs/${jobId}/retry`, data || {}),
            exportJob: (jobId: string) => apiClient.get(`/affiliates/check/jobs/${jobId}/export`, { responseType: "blob" }),
            deleteJob: (jobId: string, data?: any) => apiClient.delete(`/affiliates/check/jobs/${jobId}`, { data: data || {} }),
            externalFile: {
                upload: (file: File) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    return apiClient.post('/affiliates/check/external-file', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                    });
                },
                getSummary: (importJobId: string) =>
                    apiClient.get(`/affiliates/check/external-file/${importJobId}`),
                downloadRejectedFile: (importJobId: string) =>
                    apiClient.get(`/affiliates/check/external-file/${importJobId}/rejected-file`, { responseType: 'blob' }),
                downloadUpdatedFile: (importJobId: string) =>
                    apiClient.get(`/affiliates/check/external-file/${importJobId}/updated-file`, { responseType: 'blob' }),
                createJob: (importJobId: string, payload: { requestedCount: number; supervisorId?: string }) =>
                    apiClient.post(`/affiliates/check/external-file/${importJobId}/job`, payload),
            },
        },
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
        exportAll: () => apiClient.get('/affiliates/export-all', { responseType: 'blob' }),
        exportCustom: (data: any) => apiClient.post('/affiliates/export', data, { responseType: 'blob' }),
        distinctObrasSociales: () => apiClient.get('/affiliates/distinct-obras-sociales'),
        /* Distribución de Leads — Wizard Programar Envío */
        getDeliveryStock: (params: {
            zones?: string[];
            dateType?: string;
            exactDate?: string;
            year?: string;
            month?: string;
            obrasSociales?: string[];
        }) => {
            const p = new URLSearchParams();
            if (params.zones?.length) params.zones.forEach(z => p.append('zones[]', z));
            if (params.dateType) p.append('dateType', params.dateType);
            if (params.exactDate) p.append('exactDate', params.exactDate);
            if (params.year) p.append('year', params.year);
            if (params.month) p.append('month', params.month);
            if (params.obrasSociales?.length) params.obrasSociales.forEach(o => p.append('obrasSociales[]', o));
            return apiClient.get(`/affiliates/delivery/stock?${p.toString()}`);
        },
        executeDelivery: (data: { blocks: any[] }) => apiClient.post('/affiliates/delivery/execute', data),
        exportDelivery: (data: { zones: string[]; obrasSociales?: string[]; freshPct: number; limit: number }) =>
            apiClient.post('/affiliates/delivery/export', data, { responseType: 'blob' }),
        getDeliverySupervisors: () => apiClient.get('/affiliates/delivery/supervisors'),
        getScheduledConfig: (supervisorId: string) => apiClient.get(`/affiliates/delivery/scheduled/${supervisorId}`),
        saveScheduledConfig: (data: any) => apiClient.post('/affiliates/delivery/scheduled', data),
        deactivateScheduledConfig: (supervisorId: string) => apiClient.delete(`/affiliates/delivery/scheduled/${supervisorId}`),
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

    /* Teléfonos Corporativos (RR.HH.) */
    phones: {
        list: (filters?: { supervisor?: string; asesor?: string; numeroTelefono?: string; estado?: string }) => {
            const params = new URLSearchParams()
            if (filters?.supervisor) params.append('supervisor', filters.supervisor)
            if (filters?.asesor) params.append('asesor', filters.asesor)
            if (filters?.numeroTelefono) params.append('numeroTelefono', filters.numeroTelefono)
            if (filters?.estado) params.append('estado', filters.estado)
            const qs = params.toString()
            return apiClient.get(`/phones${qs ? `?${qs}` : ''}`)
        },
        get: (id: string) => apiClient.get(`/phones/${id}`),
        create: (data: any) => apiClient.post('/phones', data),
        update: (id: string, data: any) => apiClient.put(`/phones/${id}`, data),
        delete: (id: string) => apiClient.delete(`/phones/${id}`),
        addRecharge: (id: string, data: any) => apiClient.post(`/phones/${id}/recharges`, data),
        deleteRecharge: (id: string, rechargeId: string) => apiClient.delete(`/phones/${id}/recharges/${rechargeId}`),
        getAsesoresByEquipo: (numeroEquipo: string) => apiClient.get(`/phones/asesores/${numeroEquipo}`),
        getIndependientes: () => apiClient.get('/phones/independientes'),
        getAsesoresForFilter: () => apiClient.get('/phones/asesores-filter'),
        getStats: () => apiClient.get('/phones/stats'),
    },

    /* Bajo Rendimiento (RR.HH.) */
    lowPerformance: {
        getAll: () => apiClient.get('/low-performance'),
        getStats: () => apiClient.get('/low-performance/stats'),
        getCurrentPeriod: () => apiClient.get('/low-performance/current-period'),
        getSupervisorHistory: (supervisorId: string) => apiClient.get(`/low-performance/history/${supervisorId}`),
        evaluate: (data: { periodStart?: string; periodEnd?: string; threshold?: number }) =>
            apiClient.post('/low-performance/evaluate', data),
        evaluateHistorical: (data: { startFrom: string; threshold?: number }) =>
            apiClient.post('/low-performance/evaluate-historical', data),
        delete: (id: string) => apiClient.delete(`/low-performance/${id}`),
    },

    /* Bajas y Liquidaciones (RR.HH.) */
    separations: {
        list: (params?: any) => apiClient.get('/separations', { params }),
        get: (id: string) => apiClient.get(`/separations/${id}`),
        markPaid: (id: string) => apiClient.patch(`/separations/${id}/mark-paid`),
        updateMotivoBaja: (id: string, motivoBajaNormalizado: string | null) =>
            apiClient.patch(`/separations/${id}/motivo-baja`, { motivoBajaNormalizado }),
    },

    /* Control de Privilegios */
    privileges: {
        getStructure: () => apiClient.get('/privileges/structure'),
        getMyPermissions: () => apiClient.get('/privileges/my-permissions'),
        getByRole: (role: string) => apiClient.get(`/privileges/role/${encodeURIComponent(role)}`),
        upsert: (data: {
            role: string;
            moduleId: string;
            interfaceId: string;
            level: 'module' | 'interface';
            permissions: { acceder: boolean; ver: boolean; editar: boolean; eliminar: boolean };
        }) => apiClient.post('/privileges', data),
        getAuditLog: (params?: { role?: string; limit?: number; skip?: number }) =>
            apiClient.get('/privileges/audit-log', { params }),
        getCacheStatus: () => apiClient.get('/privileges/cache/status'),
        flushCache: () => apiClient.post('/privileges/cache/flush'),
    },

    documentProcessing: {
        getConfig: () => apiClient.get('/document-processing/config'),
        updateConfig: (data: {
            documentProcessingEnabled?: boolean;
            documentProcessingInputsRequired?: boolean;
            documentProcessingAutoTriggerEnabled?: boolean;
        }) => apiClient.put('/document-processing/config', data),
    },

    /* Aportes ARCA */
    affiliateContributions: {
        run: (data?: {
            mode?: 'pending' | 'selected' | 'filtered' | 'byObraSocial';
            limit?: number;
            affiliateIds?: string[];
            filters?: Record<string, any>;
            groups?: { obraSocial: string; limit: number }[];
        }) => apiClient.post('/affiliate-contributions/run', data || {}),
        getStats: () => apiClient.get('/affiliate-contributions/stats'),
        activeTask: () => apiClient.get('/affiliate-contributions/active-task'),
    },

    /* Base Nativa — Bot de adquisición de datos */
    nativeBot: {
        start: (data?: { maxIterations?: number }) => apiClient.post('/native-bot/start', data || {}),
        stop:  () => apiClient.post('/native-bot/stop'),
        pause: () => apiClient.post('/native-bot/pause'),
        status: () => apiClient.get('/native-bot/status'),
        activeTask: () => apiClient.get('/native-bot/active-task'),
        listAffiliates: (params?: { page?: number; limit?: number; search?: string; obraSocial?: string; provincia?: string }) =>
            apiClient.get('/native-bot/affiliates', { params }),
        getStats: () => apiClient.get('/native-bot/affiliates/stats'),
    },

    /* DATEAS Bot Control */
    dateasBot: {
        start: (data?: { maxIterations?: number }) => apiClient.post('/dateas-bot/start', data || {}),
        stop:  () => apiClient.post('/dateas-bot/stop'),
        pause: () => apiClient.post('/dateas-bot/pause'),
        resume: () => apiClient.post('/dateas-bot/resume'),
        status: () => apiClient.get('/dateas-bot/status'),
        activeTask: () => apiClient.get('/dateas-bot/active-task'),
    },

    obraSocialConfig: {
        list: () => apiClient.get('/obra-social-config'),
        get: (id: string) => apiClient.get(`/obra-social-config/${id}`),
        create: (data: any) => apiClient.post('/obra-social-config', data),
        update: (id: string, data: any) => apiClient.put(`/obra-social-config/${id}`, data),
        listPortalEnabled: () => apiClient.get('/obra-social-config/portal-enabled'),
    },

    documentProcessingCases: {
        list: () => apiClient.get('/document-processing/cases'),
        get: (id: string) => apiClient.get(`/document-processing/cases/${id}`),
        createFromAudit: (auditId: string) => apiClient.post(`/document-processing/cases/from-audit/${auditId}`),
        updateInputs: (id: string, data: any) => apiClient.put(`/document-processing/cases/${id}/inputs`, data),
        process: (id: string) => apiClient.post(`/document-processing/cases/${id}/process`),
        approveForObraSocial: (id: string) => apiClient.post(`/document-processing/cases/${id}/approve-for-obra-social`),
        uploadQr: (id: string, data: FormData) => apiClient.post(`/document-processing/cases/${id}/qr`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
        downloadQr: (id: string) => apiClient.get(`/document-processing/cases/${id}/final-qr`, { responseType: 'blob' }),
    },

    documentProcessingObraSocial: {
        listCases: () => apiClient.get('/document-processing/obra-social/cases'),
        getCase: (id: string) => apiClient.get(`/document-processing/obra-social/cases/${id}`),
        review: (id: string, data: { action: string; reason?: string }) => apiClient.post(`/document-processing/obra-social/cases/${id}/review`, data),
        downloadQr: (id: string) => apiClient.get(`/document-processing/obra-social/cases/${id}/final-qr`, { responseType: 'blob' }),
    },

    dataCheck: {
        upload: (data: FormData) => apiClient.post('/data-check/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
        createFromDatabase: (data: { obrasSociales: string[]; quantity: number }) => apiClient.post('/data-check/from-database', data),
        getDatabaseStock: (obrasSociales?: string[]) => {
            const p = new URLSearchParams();
            if (obrasSociales?.length) obrasSociales.forEach(os => p.append('obrasSociales', os));
            return apiClient.get(`/data-check/from-database/stock?${p.toString()}`);
        },
        listSessions: () => apiClient.get('/data-check/sessions'),
        getSession: (id: string) => apiClient.get(`/data-check/sessions/${id}`),
        startSession: (id: string) => apiClient.post(`/data-check/sessions/${id}/start`),
        retrySession: (id: string) => apiClient.post(`/data-check/sessions/${id}/retry`),
        downloadResult: (id: string) => apiClient.get(`/data-check/sessions/${id}/download`, { responseType: 'blob' }),
        deleteSession: (id: string) => apiClient.delete(`/data-check/sessions/${id}`),
    },

    adminCheck: {
        upload: (data: FormData) => apiClient.post('/admin-check/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
        listSessions: () => apiClient.get('/admin-check/sessions'),
        getSession: (id: string) => apiClient.get(`/admin-check/sessions/${id}`),
        startSession: (id: string) => apiClient.post(`/admin-check/sessions/${id}/start`),
        retrySession: (id: string) => apiClient.post(`/admin-check/sessions/${id}/retry`),
        downloadResult: (id: string) => apiClient.get(`/admin-check/sessions/${id}/download`, { responseType: 'blob' }),
        deleteSession: (id: string) => apiClient.delete(`/admin-check/sessions/${id}`),
    },

    /* Obras Sociales Anteriores — Catálogo AFIP T05 */
    socialHealthList: {
        list: (search?: string) => apiClient.get('/social-health-list', { params: search ? { search } : undefined }),
    },

    /* Cliente raw para requests personalizados */
    client: apiClient,
};

/* Exportar API_URL para componentes que necesitan acceso directo */
export const API_URL = API_BASE_URL;

export default apiClient;
