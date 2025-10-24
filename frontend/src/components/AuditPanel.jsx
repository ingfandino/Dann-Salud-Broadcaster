// frontend/src/components/AuditPanel.jsx

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import FollowUp from "../pages/FollowUp";
import SalesForm from "../pages/SalesForm";
import RecoveryList from "../pages/RecoveryList";
import RecoveryForm from "../pages/RecoveryForm";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/api";

export default function AuditPanel() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("seguimiento");

    // Estado para carga de multimedia
    const [audits, setAudits] = useState([]);
    const [selectedAudit, setSelectedAudit] = useState("");
    const [dniFront, setDniFront] = useState(null);
    const [dniBack, setDniBack] = useState(null);
    const [video, setVideo] = useState(null);
    const [audioBackup, setAudioBackup] = useState(null);
    const [afiliadoKey, setAfiliadoKey] = useState("");
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");
    const [afiliadoKeyDefinitiva, setAfiliadoKeyDefinitiva] = useState("");

    // Previews (object URLs) para evitar crear múltiples URLs sin revocar
    const [dniFrontPreview, setDniFrontPreview] = useState(null);
    const [dniBackPreview, setDniBackPreview] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const [audioPreview, setAudioPreview] = useState(null);

    // Refs a inputs para poder limpiar su valor nativo
    const dniFrontRef = useRef(null);
    const dniBackRef = useRef(null);
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    // Búsqueda por CUIL
    const [cuilSearch, setCuilSearch] = useState("");

    // Filtro por rango de fechas
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Tabs disponibles
    const isAdmin = user?.role === "admin" || user?.role === "Admin";
    const isGerencia = user?.role === "gerencia" || user?.role === "Gerencia";
    const tabs = [
        { id: "seguimiento", label: "📋 Seguimiento de Auditorías" },
        // Ocultar 'pautar' para admin (permitido para resto, incluyendo gerencia)
        ...(!isAdmin ? [{ id: "pautar", label: "🗓️ Pautar Nueva Venta/Auditoría" }] : []),
        { id: "upload", label: "⬆️ Subir Archivo de Auditoría" },
        // Pestañas de recuperación visibles para admin/auditor/revendedor/gerencia
        ...(user && ["admin", "auditor", "revendedor", "gerencia"].includes((user.role || "").toLowerCase()) ? [
            { id: "recovery", label: "♻️ Recuperación y reventas" },
            { id: "recovery-form", label: "📝 Nueva reventa/renovación" },
        ] : []),
    ];

    // Base de URL para archivos del backend
    const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const resolveMediaUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        if (path.startsWith("/")) return `${API_BASE}${path}`;
        return `${API_BASE}/${path}`;
    };

    // Cargar auditorías disponibles para asignar multimedia
    useEffect(() => {
        if (activeTab === "upload") {
            fetchAudits();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const fetchAudits = async () => {
        try {
            const res = await apiClient.get("/audits");
            const allAudits = res.data || [];
            // Filtrar las rechazadas
            const validAudits = allAudits.filter(a => a.status !== "Rechazada");
            setAudits(validAudits);
            if (!validAudits.length) setMessage("ℹ️ No hay auditorías registradas (no rechazadas).");
        } catch (err) {
            console.error("Error al cargar auditorías:", err);
            setMessage("❌ Error al cargar auditorías.");
        }
    };

    // Buscar auditoría por CUIL
    const handleSearchByCuil = async () => {
        if (!cuilSearch.trim()) return;
        try {
            const res = await apiClient.get(`/audits/cuil/${cuilSearch.trim()}`);
            const audit = res.data;
            if (audit?._id) {
                if (audit.status === "Rechazada") {
                    return setMessage("⚠️ La auditoría encontrada está Rechazada y no puede modificarse.");
                }
                if (!audits.find((a) => a._id === audit._id)) {
                    setAudits((prev) => [...prev, audit]);
                }
                setSelectedAudit(audit._id);
                setMessage(`✅ Auditoría encontrada para CUIL ${cuilSearch}`);
            } else {
                setMessage("❌ No se encontró auditoría para ese CUIL.");
            }
        } catch (err) {
            setMessage("❌ No se encontró auditoría para ese CUIL.");
        }
    };

    // Buscar auditorías por rango de fechas
    const handleSearchByDateRange = async () => {
        setMessage("");
        if (!dateFrom || !dateTo) {
            return setMessage("⚠️ Ingresá ambas fechas para filtrar.");
        }

        try {
            const res = await apiClient.get(`/audits/date-range?from=${dateFrom}&to=${dateTo}`);
            if (Array.isArray(res.data)) {
                // 🔹 Filtrar las rechazadas
                const validAudits = res.data.filter(a => a.status !== "Rechazada");
                if (validAudits.length > 0) {
                    setAudits(validAudits);
                    setSelectedAudit("");
                    setMessage(`✅ Se encontraron ${validAudits.length} auditorías (no rechazadas) en el rango.`);
                } else {
                    setAudits([]);
                    setMessage("ℹ️ No se encontraron auditorías válidas en ese rango.");
                }
            }
        } catch (err) {
            console.error("Error al filtrar por fechas:", err);
            setMessage("❌ Error al buscar auditorías por fechas.");
        }
    };

    // Limpieza de object URLs al desmontar
    useEffect(() => {
        return () => {
            if (dniFrontPreview) URL.revokeObjectURL(dniFrontPreview);
            if (dniBackPreview) URL.revokeObjectURL(dniBackPreview);
            if (videoPreview) URL.revokeObjectURL(videoPreview);
            if (audioPreview) URL.revokeObjectURL(audioPreview);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Helpers para manejar selección/preview/limpiado
    const handleFileSelect = (file, setFile, preview, setPreview) => {
        if (!file) return;
        if (preview) {
            try { URL.revokeObjectURL(preview); } catch { }
        }
        setFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const handleClearFile = (setFile, preview, setPreview, inputRef) => {
        if (preview) {
            try { URL.revokeObjectURL(preview); } catch { }
        }
        setFile(null);
        setPreview(null);
        if (inputRef && inputRef.current) {
            inputRef.current.value = "";
        }
    };

    // Obtener objeto de auditoría seleccionado
    const auditObj = audits.find((a) => a._id === selectedAudit);
    const auditIsComplete = !!auditObj?.isComplete;

    const handleUpload = async () => {
        setMessage("");
        if (!selectedAudit) {
            setMessage("Selecciona una auditoría primero.");
            return;
        }

        if (auditIsComplete) {
            setMessage("Esta auditoría ya está completa y no puede modificarse.");
            return;
        }

        if (!video && !(auditObj && auditObj.multimedia && auditObj.multimedia.video)) {
            setMessage("Debes subir el video de la auditoría (o la auditoría ya debe tener uno).");
            return;
        }

        if (afiliadoKey) formData.append("afiliadoKey", afiliadoKey);
        if (user?.role === "admin" && afiliadoKeyDefinitiva)
            formData.append("afiliadoKeyDefinitiva", afiliadoKeyDefinitiva);

        setUploading(true);

        try {
            const formData = new FormData();
            if (dniFront) formData.append("images", dniFront);
            if (dniBack) formData.append("images", dniBack);
            if (video) formData.append("video", video);
            if (audioBackup) formData.append("audioBackup", audioBackup);
            if (afiliadoKey) formData.append("afiliadoKey", afiliadoKey);

            const res = await apiClient.post(`/audits/${selectedAudit}/multimedia`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const updatedAudit = res.data;
            setAudits((prev) => prev.map((a) => (a._id === updatedAudit._id ? updatedAudit : a)));

            setMessage("✅ Archivos subidos correctamente.");

            // Limpiar states y previews
            handleClearFile(setDniFront, dniFrontPreview, setDniFrontPreview, dniFrontRef);
            handleClearFile(setDniBack, dniBackPreview, setDniBackPreview, dniBackRef);
            handleClearFile(setVideo, videoPreview, setVideoPreview, videoRef);
            handleClearFile(setAudioBackup, audioPreview, setAudioPreview, audioRef);
            setAfiliadoKey("");
            setAfiliadoKeyDefinitiva("");
            setSelectedAudit("");
        } catch (err) {
            console.error(err);
            setMessage("❌ Error al subir los archivos.");
        } finally {
            setUploading(false);
        }
    };

    // Preview render para archivos locales
    const renderLocalPreview = (file, previewUrl) => {
        if (!file || !previewUrl) return null;
        if (file.type.startsWith("image/")) {
            return <img src={previewUrl} alt="preview" className="mt-2 max-h-40 rounded shadow" />;
        } else if (file.type.startsWith("video/")) {
            return <video src={previewUrl} controls className="mt-2 max-h-40 rounded shadow" />;
        } else if (file.type.startsWith("audio/")) {
            return <audio src={previewUrl} controls className="mt-2 w-full" />;
        } else {
            return <p className="mt-2 text-sm text-gray-500">Archivo seleccionado: {file.name}</p>;
        }
    };

    // Render de archivos remotos
    const renderRemoteList = (multimedia = {}) => {
        const images = multimedia.images || [];
        const videoUrl = multimedia.video ? resolveMediaUrl(multimedia.video) : null;
        const audioUrl = multimedia.audioBackup ? resolveMediaUrl(multimedia.audioBackup) : null;
        const afiliado = multimedia.afiliadoKey || null;

        if (!images.length && !videoUrl && !audioUrl && !afiliado) {
            return <p className="text-sm text-gray-600">No hay archivos registrados en esta auditoría.</p>;
        }

        return (
            <ul className="space-y-2 text-sm">
                {images.map((img, i) => {
                    const imgUrl = resolveMediaUrl(img);
                    return (
                        <li key={i}>
                            📷{" "}
                            <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mr-2">
                                DNI {i === 0 ? "Frontal" : "Dorso"}
                            </a>
                            <a href={imgUrl} download className="text-gray-600 ml-2">(descargar)</a>
                        </li>
                    );
                })}

                {videoUrl && (
                    <li>
                        🎥{" "}
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mr-2">
                            Video Auditoría
                        </a>
                        <a href={videoUrl} download className="text-gray-600 ml-2">(descargar)</a>
                    </li>
                )}

                {audioUrl && (
                    <li>
                        🎧{" "}
                        <a href={audioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mr-2">
                            Audio/Vídeo Respaldatorio
                        </a>
                        <a href={audioUrl} download className="text-gray-600 ml-2">(descargar)</a>
                    </li>
                )}

                {afiliado && (
                    <li>🔑 Clave Afiliado: <span className="font-mono ml-1">{afiliado}</span></li>
                )}

                {((user?.role || '').toLowerCase() === "gerencia") && multimedia.afiliadoKeyDefinitiva && (
                    <li>🔐 Clave Afiliado (Definitiva): <span className="font-mono ml-1">{multimedia.afiliadoKeyDefinitiva}</span></li>
                )}
            </ul>
        );
    };

    const allowedRoles = ["admin", "auditor", "supervisor", "gerencia"];
    const canUpload = allowedRoles.includes((user?.role || "").toLowerCase());

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Panel de Auditorías</h1>

            {/* Tabs */}
            <div className="flex gap-3 mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === tab.id
                            ? "bg-brand-blue text-white shadow-md"
                            : "bg-white text-gray-600 border hover:bg-gray-50"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-50 rounded-xl p-4"
            >
                {activeTab === "seguimiento" && <FollowUp currentUser={user} />}
                {activeTab === "pautar" && <SalesForm currentUser={user} />}
                {activeTab === "upload" && (
                    <div className="p-4 border rounded bg-white shadow-md">
                        <h2 className="text-lg font-semibold mb-4">Subir Archivos de Auditoría</h2>

                        {!canUpload ? (
                            <p className="text-red-600">No tienes permisos para subir archivos.</p>
                        ) : (
                            <>
                                {/* Buscar por CUIL */}
                                <div className="mb-4 flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="block font-medium mb-1">Buscar por CUIL</label>
                                        <input
                                            type="text"
                                            value={cuilSearch}
                                            onChange={(e) => setCuilSearch(e.target.value)}
                                            placeholder="Ej: 20123456789"
                                            className="border p-2 rounded w-full"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearchByCuil}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                        type="button"
                                    >
                                        Buscar
                                    </button>
                                </div>
                                {message && (
                                    <div
                                        className={`mb-3 px-4 py-2 rounded text-sm font-medium ${message.startsWith("✅")
                                            ? "bg-green-100 text-green-800"
                                            : message.startsWith("❌")
                                                ? "bg-red-100 text-red-800"
                                                : "bg-yellow-50 text-yellow-700"
                                            }`}
                                    >
                                        {message}
                                    </div>
                                )}
                                {/* Buscar por rango de fechas */}
                                <div className="mb-4 flex flex-wrap gap-2 items-end">
                                    <div>
                                        <label className="block font-medium mb-1">Desde</label>
                                        <input
                                            type="date"
                                            value={dateFrom}
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="border p-2 rounded"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-medium mb-1">Hasta</label>
                                        <input
                                            type="date"
                                            value={dateTo}
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="border p-2 rounded"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearchByDateRange}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                        type="button"
                                    >
                                        Filtrar
                                    </button>
                                </div>
                                {/* Seleccionar auditoría */}
                                <div className="mb-4">
                                    <label className="block font-medium mb-1">Auditoría (afiliado / CUIL)</label>
                                    <select
                                        className="border p-2 rounded w-full"
                                        value={selectedAudit}
                                        onChange={(e) => setSelectedAudit(e.target.value)}
                                    >
                                        <option value="">-- Selecciona una auditoría --</option>
                                        {audits.map((a) => (
                                            <option key={a._id} value={a._id}>
                                                {a.nombre} - {a.cuil} ({a.obraSocialVendida}) {a.isComplete ? " ✅ (Completa)" : " ⏳ (Incompleta)"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Vista con archivos registrados */}
                                {selectedAudit && (
                                    <div className="mb-4 bg-gray-100 border rounded p-3">
                                        <h3 className="font-semibold mb-2">📎 Archivos guardados en la auditoría</h3>
                                        {renderRemoteList(auditObj?.multimedia)}
                                        {auditIsComplete && (
                                            <p className="mt-2 text-sm text-green-600">
                                                Esta auditoría está marcada como <strong>COMPLETA</strong>. No puede modificarse.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Inputs de archivos */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    {/* DNI Frontal */}
                                    <div>
                                        <label className="block font-medium mb-1">📷 DNI (Frontal)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={dniFrontRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileSelect(e.target.files[0], setDniFront, dniFrontPreview, setDniFrontPreview)}
                                                className="border p-2 rounded w-full"
                                                disabled={auditIsComplete}
                                            />
                                            {dniFront && (
                                                <button
                                                    onClick={() => handleClearFile(setDniFront, dniFrontPreview, setDniFrontPreview, dniFrontRef)}
                                                    className="text-red-500 font-bold text-xl"
                                                    title="Quitar archivo"
                                                    type="button"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        {renderLocalPreview(dniFront, dniFrontPreview)}
                                    </div>

                                    {/* DNI Dorso */}
                                    <div>
                                        <label className="block font-medium mb-1">📷 DNI (Dorso)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={dniBackRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handleFileSelect(e.target.files[0], setDniBack, dniBackPreview, setDniBackPreview)}
                                                className="border p-2 rounded w-full"
                                                disabled={auditIsComplete}
                                            />
                                            {dniBack && (
                                                <button
                                                    onClick={() => handleClearFile(setDniBack, dniBackPreview, setDniBackPreview, dniBackRef)}
                                                    className="text-red-500 font-bold text-xl"
                                                    title="Quitar archivo"
                                                    type="button"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        {renderLocalPreview(dniBack, dniBackPreview)}
                                    </div>

                                    {/* Video Auditoría */}
                                    <div className="sm:col-span-2">
                                        <label className="block font-medium mb-1">🎥 Video Auditoría (Obligatorio)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={videoRef}
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => handleFileSelect(e.target.files[0], setVideo, videoPreview, setVideoPreview)}
                                                className="border p-2 rounded w-full"
                                                disabled={auditIsComplete}
                                            />
                                            {video && (
                                                <button
                                                    onClick={() => handleClearFile(setVideo, videoPreview, setVideoPreview, videoRef)}
                                                    className="text-red-500 font-bold text-xl"
                                                    title="Quitar archivo"
                                                    type="button"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        {renderLocalPreview(video, videoPreview)}
                                    </div>

                                    {/* Audio respaldatorio */}
                                    <div className="sm:col-span-2">
                                        <label className="block font-medium mb-1">🎧 Audio/Vídeo Respaldatorio (Opcional)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={audioRef}
                                                type="file"
                                                accept="audio/*,video/*"
                                                onChange={(e) => handleFileSelect(e.target.files[0], setAudioBackup, audioPreview, setAudioPreview)}
                                                className="border p-2 rounded w-full"
                                                disabled={auditIsComplete}
                                            />
                                            {audioBackup && (
                                                <button
                                                    onClick={() => handleClearFile(setAudioBackup, audioPreview, setAudioPreview, audioRef)}
                                                    className="text-red-500 font-bold text-xl"
                                                    title="Quitar archivo"
                                                    type="button"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                        {renderLocalPreview(audioBackup, audioPreview)}
                                    </div>
                                </div>

                                {/* Clave afiliado */}
                                {/* Claves de afiliado */}
                                <div className="mb-4 grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-medium mb-1">🔑 Clave del Afiliado</label>
                                        <input
                                            type="text"
                                            value={afiliadoKey}
                                            onChange={(e) => setAfiliadoKey(e.target.value)}
                                            placeholder="Ej: ABC123"
                                            className="border p-2 rounded w-full"
                                            disabled={auditIsComplete}
                                        />
                                    </div>

                                    {(isGerencia) && (
                                        <div>
                                            <label className="block font-medium mb-1">🔐 Clave de Afiliado (Definitiva)</label>
                                            <input
                                                type="text"
                                                value={afiliadoKeyDefinitiva}
                                                onChange={(e) => setAfiliadoKeyDefinitiva(e.target.value)}
                                                placeholder="Ej: XYZ789"
                                                className="border p-2 rounded w-full"
                                                disabled={auditIsComplete}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Botón de envío */}
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || auditIsComplete}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {uploading ? "Subiendo..." : "Subir Archivos"}
                                </button>

                                {message && (
                                    <p
                                        className={`mt-3 font-medium ${message.startsWith("✅") ? "text-green-600" : "text-red-600"}`}
                                    >
                                        {message}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}
                {activeTab === "recovery" && <RecoveryList />}
                {activeTab === "recovery-form" && <RecoveryForm />}
            </motion.div>
        </div>
    );
}