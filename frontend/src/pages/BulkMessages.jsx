// frontend/src/pages/BulkMessages.jsx

import React, { useEffect, useState, useRef } from "react";
import { fetchJobs, createJob, jobAction } from "../services/jobService";
import {
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
} from "../services/templateService";
import { previewMessage } from "../services/messageService";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getWhatsappStatus, logoutWhatsapp } from "../services/api"; // 
import apiClient from "../services/api";
import logger from "../utils/logger";
import { fetchAutoresponses, createAutoresponse, updateAutoresponse, deleteAutoresponse } from "../services/autoresponseService";

export default function BulkMessages() {
    const [jobs, setJobs] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [preview, setPreview] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadSummary, setUploadSummary] = useState(null);

    const [showAutoResp, setShowAutoResp] = useState(false);
    const [autoResponses, setAutoResponses] = useState([]);
    const [autoForm, setAutoForm] = useState({ keyword: "", response: "", matchType: "contains", isFallback: false, active: true });
    const [editingAutoId, setEditingAutoId] = useState(null);
    const [windowMinutes, setWindowMinutes] = useState(30);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const [form, setForm] = useState({
        name: "",
        templateId: "",
        message: "",
        contacts: [],
        scheduledFor: "",
        delayBetween: 2,
        batchSize: 10,
        pauseBetweenBatches: 30,
    });

    // Evitar múltiples clics en desconexión
    const [loggingOut, setLoggingOut] = useState(false);
    const logoutGuardRef = useRef(false);

    const { user } = useAuth();
    const navigate = useNavigate();

    // estado de comprobación del vínculo del teléfono
    const [checkingLink, setCheckingLink] = useState(true);

    // Desconectar dispositivo
    async function handleLogoutDevice() {
        if (logoutGuardRef.current || loggingOut) return;
        logoutGuardRef.current = true; // guard inmediato en el mismo tick
        setLoggingOut(true);
        console.log("[BulkMessages] Llamando a logoutWhatsapp...");
        const confirmed = window.confirm(
            "¿Seguro que deseas desconectar este dispositivo?\nSe deberá escanear un nuevo QR para volver a vincular."
        );
        if (!confirmed) {
            setLoggingOut(false);
            logoutGuardRef.current = false;
            return;
        }
        try {
            // 1. Ejecutar logout y esperar confirmación del servidor
            await logoutWhatsapp();
        } catch (err) {
            toast.error("Error al procesar la desconexión en el servidor.");
            logger.error("Error en llamada a logoutWhatsapp:", err);
        } finally {
            // 2. Navegar con estado indicando logout ya iniciado en backend
            navigate("/qr-link", { replace: true, state: { fromLogout: true } });
            // Mantener loggingOut y guard activados hasta que el flujo continúe en QrLink
        }
    }

    // cargar jobs y plantillas al inicio, pero solo si el WA está vinculado
    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
                setCheckingLink(true);
                const status = await getWhatsappStatus();
                // status esperado: { connected: true/false, phoneNumber: "..."}

                if (!mounted) return;

                if (!status?.connected) {
                    toast.info(" No hay teléfono vinculado. Redirigiendo a la pantalla de vinculación...");
                    navigate("/qr-link", { replace: true });
                    return;
                }

                // si todo ok, cargar recursos
                await loadJobs();
                await loadTemplates();
            } catch (err) {
                toast.error(" No fue posible comprobar el estado del teléfono. Redirigiendo a vinculación...");
                navigate("/qr-link", { replace: true });
            } finally {
                if (mounted) setCheckingLink(false);
            }
        }

        init();

        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // solo al montar

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const list = await fetchAutoresponses();
                if (mounted) setAutoResponses(list);
            } catch {}
            try {
                const res = await apiClient.get("/autoresponses/settings/env");
                if (mounted && res?.data?.windowMinutes) setWindowMinutes(res.data.windowMinutes);
            } catch {}
        };
        if (showAutoResp) load();
        return () => { mounted = false; };
    }, [showAutoResp]);

    const handleAutoChange = (e) => {
        const { name, value, type, checked } = e.target;
        setAutoForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    };

    const resetAutoForm = () => {
        setAutoForm({ keyword: "", response: "", matchType: "contains", isFallback: false, active: true });
        setEditingAutoId(null);
    };

    const handleAutoSave = async () => {
        try {
            if (!autoForm.response.trim()) { toast.error("La respuesta no puede estar vacía"); return; }
            let payload = { response: autoForm.response, matchType: autoForm.matchType, isFallback: autoForm.isFallback, active: autoForm.active };
            if (!autoForm.isFallback) {
                if (!autoForm.keyword.trim()) { toast.error("Debes indicar una palabra clave"); return; }
                payload.keyword = autoForm.keyword.trim();
            } else {
                payload.keyword = null;
            }
            if (editingAutoId) {
                const updated = await updateAutoresponse(editingAutoId, payload);
                setAutoResponses((list) => list.map((r) => (r._id === updated._id ? updated : r)));
                toast.success("Autorespuesta actualizada");
            } else {
                const created = await createAutoresponse(payload);
                setAutoResponses((list) => [created, ...list]);
                toast.success("Autorespuesta creada");
            }
            resetAutoForm();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Error guardando autorespuesta");
        }
    };

    const handleAutoEdit = (item) => {
        setEditingAutoId(item._id);
        setAutoForm({
            keyword: item.keyword || "",
            response: item.response || "",
            matchType: item.matchType || "contains",
            isFallback: !!item.isFallback,
            active: item.active !== false,
        });
    };

    const handleAskDelete = (id) => { setConfirmDeleteId(id); setShowConfirm(true); };
    const handleConfirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await deleteAutoresponse(confirmDeleteId);
            setAutoResponses((list) => list.filter((r) => r._id !== confirmDeleteId));
            toast.success("Autorespuesta eliminada");
            if (editingAutoId === confirmDeleteId) resetAutoForm();
        } catch {
            toast.error("Error eliminando autorespuesta");
        } finally {
            setShowConfirm(false);
            setConfirmDeleteId(null);
        }
    };

    async function loadJobs() {
        try {
            const data = await fetchJobs();
            setJobs(data);
        } catch {
            toast.error("Error cargando campañas");
        }
    }

    async function loadTemplates() {
        try {
            const data = await fetchTemplates();
            setTemplates(data);
        } catch {
            toast.error("Error cargando plantillas");
        }
    }

    const handleFileChange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!user?._id) {
            toast.error("No se pudo identificar el usuario");
            return;
        }
        try {
            setUploading(true);
            const fd = new FormData();
            fd.append("file", file);
            fd.append("createdBy", user._id);
            const res = await (await import("../services/api")).default.post("/contacts/import", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const inserted = res.data?.insertedContacts || [];
            if (inserted.length === 0) {
                toast.warn("No se importaron contactos válidos");
            } else {
                setForm((prev) => ({ ...prev, contacts: inserted.map((c) => c._id) }));
                toast.success(`Contactos importados: ${inserted.length}`);
            }
            setUploadSummary({
                inserted: res.data?.resumen?.inserted || 0,
                invalid: res.data?.resumen?.invalid || 0,
            });
        } catch {
            toast.error("Error importando contactos");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));

        // al cambiar plantilla, rellenar nombre y mensaje
        if (name === "templateId") {
            if (value === "") {
                setForm((prev) => ({
                    ...prev,
                    templateId: "",
                    name: "",
                    message: "",
                }));
            } else {
                const t = templates.find((tpl) => tpl._id === value);
                if (t) {
                    setForm((prev) => ({
                        ...prev,
                        templateId: t._id,
                        name: t.nombre,
                        message: t.contenido,
                    }));
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!form.templateId && !form.message) {
                toast.error("Debes ingresar mensaje libre o elegir una plantilla");
                return;
            }
            await createJob(form);
            toast.success("Campaña creada ");
            setForm({
                name: "",
                templateId: "",
                message: "",
                contacts: [],
                scheduledFor: "",
                delayBetween: 2,
                batchSize: 10,
                pauseBetweenBatches: 30,
            });
            setPreview(null);
            loadJobs();
        } catch {
            toast.error("Error creando campaña");
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === "cancel") {
                const confirmed = window.confirm(
                    "¿Seguro que deseas eliminar esta campaña? Esta acción no se puede deshacer."
                );
                if (!confirmed) return;
            }
            await jobAction(id, action);
            toast.success(`Acción '${action}' ejecutada`);
            loadJobs();
        } catch {
            toast.error(`Error al ejecutar acción '${action}'`);
        }
    };

    const handlePreview = async () => {
        try {
            if (!form.templateId && !form.message) {
                toast.error("Debes ingresar mensaje libre o elegir una plantilla");
                return;
            }
            const contactId = form.contacts[0];
            if (!contactId) {
                toast.error("Debes elegir al menos un contacto para generar preview");
                return;
            }

            const data = await previewMessage({
                message: form.message,
                templateId: form.templateId || null,
                contactId,
            });

            setPreview(data.preview);
        } catch {
            toast.error("Error generando preview");
        }
    };

    // Guardar o actualizar plantilla
    const handleSaveTemplate = async () => {
        try {
            if (!form.message.trim()) {
                toast.error("El contenido de la plantilla no puede estar vacío");
                return;
            }

            if (!user?._id) {
                toast.error("No se pudo identificar el usuario");
                return;
            }

            if (form.templateId) {
                await updateTemplate(form.templateId, {
                    nombre: form.name || "Plantilla sin nombre",
                    contenido: form.message,
                    createdBy: user._id,
                });
                toast.success("Plantilla actualizada ");
            } else {
                const nueva = await createTemplate({
                    nombre: form.name || "Plantilla sin nombre",
                    contenido: form.message,
                    createdBy: user._id,
                });
                toast.success("Plantilla creada ");
                setForm((prev) => ({ ...prev, templateId: nueva._id }));
            }

            loadTemplates();
            setForm((prev) => ({
                ...prev,
                name: "",
                message: "",
                templateId: "",
            }));
        } catch {
            toast.error("Error al guardar plantilla");
        }
    };

    // Eliminar plantilla
    const handleDeleteTemplate = async () => {
        try {
            if (!form.templateId) {
                toast.error("Selecciona una plantilla para eliminar");
                return;
            }
            const confirm = window.confirm("¿Seguro que deseas eliminar esta plantilla?");
            if (!confirm) return;

            await deleteTemplate(form.templateId);
            toast.success("Plantilla eliminada ");
            setForm((prev) => ({ ...prev, templateId: "", name: "", message: "" }));
            loadTemplates();
        } catch {
            toast.error("Error al eliminar plantilla");
        }
    };

    const insertAtCursor = (before, after = "") => {
        const textarea = document.querySelector("textarea[name='message']");
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = form.message;
        const newText =
            text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
        setForm((prev) => ({ ...prev, message: newText }));
    };

    const emojis = ["", "", "", "", "", "", "", "", "", "", "", ""];

    if (checkingLink) {
        return (
            <div className="p-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <p className="text-lg">Comprobando estado del teléfono vinculado…</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <h1 className="text-2xl font-bold mb-4"> Mensajería Masiva</h1>

                {/* Botones de navegación */}
                <div className="flex justify-end mb-4 gap-2">
                    <label className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 cursor-pointer">
                         Subir contactos (CSV/XLS)
                        <input
                            type="file"
                            accept=".csv,.xls,.xlsx"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    <button
                        onClick={handleLogoutDevice}
                        disabled={loggingOut}
                        className={`px-4 py-2 rounded text-white ${loggingOut ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                    >
                        {loggingOut ? "Desconectando..." : " Desconectar dispositivo"}
                    </button>

                    <button
                        onClick={() => { setShowAutoResp(true); resetAutoForm(); }}
                        className="px-4 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Auto-respuestas
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
                    >
                         ← Volver al Menú
                    </button>
                </div>

                {/* Formulario de creación */}
                <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-4">
                    {uploadSummary && (
                        <div className="text-sm text-gray-600">
                            {`Importados: ${uploadSummary.inserted}  |  Inválidos: ${uploadSummary.invalid}`}
                        </div>
                    )}
                    <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Nombre de la campaña"
                        className="w-full border p-2 rounded"
                    />

                    <div className="space-y-2">
                        <select
                            name="templateId"
                            value={form.templateId}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        >
                            <option value="">-- Selecciona plantilla (opcional) --</option>
                            {templates.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.nombre}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSaveTemplate}
                                className="flex-1 bg-indigo-600 text-white py-1 rounded hover:bg-indigo-700"
                            >
                                Guardar Plantilla
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteTemplate}
                                className="flex-1 bg-red-600 text-white py-1 rounded hover:bg-red-700"
                            >
                                Eliminar Plantilla
                            </button>
                        </div>
                    </div>

                    {/* Toolbar de edición */}
                    <div className="flex gap-2 mb-2 relative">
                        <button
                            type="button"
                            onClick={() => insertAtCursor("*", "*")}
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            <b>B</b>
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("_", "_")}
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            <i>I</i>
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            😀
                        </button>
                        <button
                            type="button"
                            onClick={() => insertAtCursor("{opción1|opción2}")}
                            className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                            Spintax
                        </button>

                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                            <div className="absolute top-10 left-0 bg-white border rounded shadow p-2 grid grid-cols-6 gap-2 z-10">
                                {emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                            insertAtCursor(emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                        className="text-xl hover:bg-gray-100 rounded"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        placeholder="Mensaje libre (se ignora si seleccionas plantilla)"
                        className="w-full border p-2 rounded"
                        rows={4}
                    />

                    {/* Previsualizar */}
                    <button
                        type="button"
                        onClick={handlePreview}
                        className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                    >
                        Previsualizar
                    </button>

                    {/* Bloque parámetros */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded border">
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                ⏱️ Tiempo entre mensajes (seg)
                            </label>
                            <input
                                type="number"
                                name="delayBetween"
                                value={form.delayBetween}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                📦 Tamaño del lote
                            </label>
                            <input
                                type="number"
                                name="batchSize"
                                value={form.batchSize}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">
                                😴 Descanso entre lotes (seg)
                            </label>
                            <input
                                type="number"
                                name="pauseBetweenBatches"
                                value={form.pauseBetweenBatches}
                                onChange={handleChange}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                    </div>

                    {/* Programar envío */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            📅 Programar hora de envío (opcional)
                        </label>
                        <input
                            type="datetime-local"
                            name="scheduledFor"
                            value={form.scheduledFor}
                            onChange={handleChange}
                            className="w-full border p-2 rounded"
                        />
                    </div>

                    {/* Botón principal */}
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 text-lg font-semibold"
                    >
                        🚀 Iniciar envío
                    </button>
                </form>

                {preview && (
                    <div className="mt-4 p-3 border rounded bg-gray-50">
                        <p className="font-semibold mb-2">🔍 Vista previa:</p>
                        <p>{preview}</p>
                    </div>
                )}

                {/* Tabla de Jobs */}
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-2">📋 Campañas creadas</h2>
                    <table className="w-full border text-left">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="p-2 border">Nombre</th>
                                <th className="p-2 border">Estado</th>
                                <th className="p-2 border">Progreso</th>
                                <th className="p-2 border">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => (
                                <tr key={job._id}>
                                    <td className="p-2 border">
                                        <button
                                            onClick={() => navigate(`/jobs/${job._id}`)}
                                            className="text-blue-600 underline"
                                        >
                                            {job.name}
                                        </button>
                                    </td>
                                    <td className="p-2 border">{job.status}</td>
                                    <td className="p-2 border">{job.progress || 0}%</td>
                                    <td className="p-2 border space-x-2">
                                        <button
                                            onClick={() => handleAction(job._id, "pause")}
                                            className="px-2 py-1 bg-yellow-500 text-white rounded"
                                        >
                                            Pausar
                                        </button>
                                        <button
                                            onClick={() => handleAction(job._id, "resume")}
                                            className="px-2 py-1 bg-green-500 text-white rounded"
                                        >
                                            Reanudar
                                        </button>
                                        <button
                                            onClick={() => handleAction(job._id, "cancel")}
                                            className="px-2 py-1 bg-red-500 text-white rounded"
                                        >
                                            Cancelar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {showAutoResp && (
                    <div className="fixed inset-0 z-50 flex">
                        <div className="flex-1 bg-black/30" onClick={() => setShowAutoResp(false)} />
                        <div className="w-full sm:w-[560px] max-w-[95%] h-full bg-white shadow-2xl overflow-auto">
                            <div className="flex items-center justify-between p-3 border-b">
                                <h3 className="font-semibold">Auto-respuestas</h3>
                                <button className="text-gray-600 hover:text-gray-900" onClick={() => setShowAutoResp(false)}>✖</button>
                            </div>
                            <div className="p-3 space-y-4">
                                <div className="p-3 rounded bg-blue-50 text-blue-900 text-sm border border-blue-200">
                                    <div className="font-medium mb-1">Ventana anti-spam activa: {windowMinutes} minutos</div>
                                    <div>Durante esta ventana, solo se envía una auto-respuesta por contacto. Ejemplos:</div>
                                    <ul className="list-disc ml-4 mt-1">
                                        <li>Si alguien escribe "A" y luego "A"/"B" dentro de {windowMinutes} min, se responde solo la primera vez.</li>
                                        <li>Pasada la ventana, si vuelve a escribir, se vuelve a evaluar y responder.</li>
                                    </ul>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {!autoForm.isFallback && (
                                        <input name="keyword" value={autoForm.keyword} onChange={handleAutoChange} placeholder="Palabra clave" className="border p-2 rounded" />
                                    )}
                                    <textarea name="response" value={autoForm.response} onChange={handleAutoChange} placeholder="Respuesta" className="border p-2 rounded" rows={3} />
                                    <div className="flex gap-2 items-center">
                                        <select name="matchType" value={autoForm.matchType} onChange={handleAutoChange} className="border p-2 rounded">
                                            <option value="contains">Contiene</option>
                                            <option value="exact">Exacta</option>
                                        </select>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" name="isFallback" checked={autoForm.isFallback} onChange={handleAutoChange} />
                                            Comodín
                                        </label>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" name="active" checked={autoForm.active} onChange={handleAutoChange} />
                                            Activa
                                        </label>
                                        <div className="ml-auto flex gap-2">
                                            <button onClick={handleAutoSave} className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700">{editingAutoId ? "Actualizar" : "Crear"}</button>
                                            {editingAutoId && (
                                                <button onClick={resetAutoForm} className="px-3 py-2 rounded bg-gray-300 hover:bg-gray-400">Cancelar</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t pt-3">
                                    <table className="w-full border text-left text-sm">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="p-2 border">Keyword</th>
                                                <th className="p-2 border">Match</th>
                                                <th className="p-2 border">Fallback</th>
                                                <th className="p-2 border">Activa</th>
                                                <th className="p-2 border">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {autoResponses.map((r) => (
                                                <tr key={r._id}>
                                                    <td className="p-2 border">{r.keyword || "-"}</td>
                                                    <td className="p-2 border">{r.matchType || "contains"}</td>
                                                    <td className="p-2 border">{r.isFallback ? "Sí" : "No"}</td>
                                                    <td className="p-2 border">{r.active !== false ? "Sí" : "No"}</td>
                                                    <td className="p-2 border space-x-2">
                                                        <button onClick={() => handleAutoEdit(r)} className="px-2 py-1 bg-indigo-600 text-white rounded">Editar</button>
                                                        <button onClick={() => handleAskDelete(r._id)} className="px-2 py-1 bg-red-600 text-white rounded">Eliminar</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {autoResponses.length === 0 && (
                                                <tr>
                                                    <td className="p-2 border" colSpan="5">Sin reglas creadas</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {showConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirm(false)} />
                        <div className="relative bg-white w-full max-w-sm rounded shadow-lg p-4">
                            <div className="text-lg font-semibold mb-2">Confirmar eliminación</div>
                            <div className="text-sm text-gray-700 mb-4">¿Seguro que deseas eliminar esta autorespuesta? Esta acción no se puede deshacer.</div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowConfirm(false)} className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300">Cancelar</button>
                                <button onClick={handleConfirmDelete} className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700">Eliminar</button>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}