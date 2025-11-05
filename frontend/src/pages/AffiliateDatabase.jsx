// frontend/src/pages/AffiliateDatabase.jsx

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";

export default function AffiliateDatabase() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("upload");
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    const fileInputRef = useRef(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedObraSocial, setSelectedObraSocial] = useState("all");
    const [affiliates, setAffiliates] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
    const [stats, setStats] = useState(null);
    const [exportConfig, setExportConfig] = useState({
        affiliatesPerFile: 100,
        scheduledTime: "09:00",
        filters: {}
    });
    const [currentConfig, setCurrentConfig] = useState(null);
    const [exports, setExports] = useState([]);
    const [lastUploadResult, setLastUploadResult] = useState(null);

    useEffect(() => {
        loadStats();
        loadExportConfig();
    }, []);

    useEffect(() => {
        if (activeTab === "search") {
            // Limpiar datos viejos primero
            if (stats?.total === 0) {
                setAffiliates([]);
                setPagination({ page: 1, limit: 50, total: 0, pages: 0 });
            } else {
                searchAffiliates();
            }
        } else if (activeTab === "exports") {
            loadExports();
        } else {
            // Al cambiar de tab, limpiar búsqueda si no hay datos reales
            if (stats?.total === 0) {
                setAffiliates([]);
            }
        }
    }, [activeTab, searchQuery, selectedObraSocial, pagination.page, stats?.total]);

    const loadStats = async () => {
        try {
            const res = await apiClient.get("/affiliates/stats");
            setStats(res.data);
            
            // Si no hay datos, limpiar estado completamente
            if (res.data.total === 0) {
                setAffiliates([]);
                setPagination({ page: 1, limit: 50, total: 0, pages: 0 });
            }
        } catch (err) {
            logger.error("Error cargando estadísticas:", err);
        }
    };

    const loadExportConfig = async () => {
        try {
            const res = await apiClient.get("/affiliates/export-config");
            if (res.data.config) {
                setCurrentConfig(res.data.config);
                setExportConfig({
                    affiliatesPerFile: res.data.config.affiliatesPerFile,
                    scheduledTime: res.data.config.scheduledTime,
                    filters: res.data.config.filters || {}
                });
            }
        } catch (err) {
            logger.error("Error cargando configuración:", err);
        }
    };

    const loadExports = async () => {
        try {
            const res = await apiClient.get("/affiliates/exports");
            setExports(res.data.exports || []);
        } catch (err) {
            logger.error("Error cargando exportaciones:", err);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const ext = selectedFile.name.split(".").pop().toLowerCase();
            if (ext !== "xlsx" && ext !== "xls") {
                toast.error("Solo se permiten archivos .xlsx o .xls");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error("Por favor selecciona un archivo");
            return;
        }

        try {
            setLoading(true);
            setUploadProgress({ current: 0, total: 100 });

            const formData = new FormData();
            formData.append("file", file);

            const res = await apiClient.post("/affiliates/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress({ current: percentCompleted, total: 100 });
                }
            });

            // Guardar resultado para mostrar resumen
            setLastUploadResult({
                imported: res.data.imported,
                duplicates: res.data.duplicates,
                rejected: res.data.duplicates,
                total: res.data.total,
                duplicatesReport: res.data.duplicatesReport
            });

            // Mostrar mensaje de éxito
            if (res.data.duplicates > 0) {
                toast.warning(
                    `⚠️ Procesado: ${res.data.imported} importados, ${res.data.duplicates} rechazados/duplicados de ${res.data.total} total`,
                    { autoClose: 8000 }
                );
            } else {
                toast.success(
                    `✅ ${res.data.imported} afiliados importados exitosamente de ${res.data.total} total`,
                    { autoClose: 5000 }
                );
            }

            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setUploadProgress(null);
            loadStats();
            
            // Cambiar a tab de estadísticas automáticamente
            setTimeout(() => setActiveTab("stats"), 1000);

        } catch (err) {
            logger.error("Error subiendo archivo:", err);
            toast.error(err.response?.data?.error || "Error procesando archivo");
        } finally {
            setLoading(false);
        }
    };

    const searchAffiliates = async (page = pagination.page) => {
        try {
            setLoading(true);
            const res = await apiClient.get("/affiliates/search", {
                params: {
                    query: searchQuery || undefined,
                    obraSocial: selectedObraSocial !== "all" ? selectedObraSocial : undefined,
                    page,
                    limit: pagination.limit
                }
            });

            setAffiliates(res.data.affiliates);
            setPagination(res.data.pagination);

        } catch (err) {
            logger.error("Error buscando afiliados:", err);
            toast.error("Error buscando afiliados");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveExportConfig = async () => {
        try {
            setLoading(true);
            await apiClient.post("/affiliates/export-config", exportConfig);
            toast.success("✅ Configuración guardada. Los envíos comenzarán mañana a la hora indicada.");
            loadExportConfig();
        } catch (err) {
            logger.error("Error guardando configuración:", err);
            toast.error(err.response?.data?.error || "Error guardando configuración");
        } finally {
            setLoading(false);
        }
    };

    const deleteAffiliate = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar este afiliado?")) return;

        try {
            await apiClient.delete(`/affiliates/${id}`);
            toast.success("✅ Afiliado eliminado");
            searchAffiliates();
            loadStats();
        } catch (err) {
            logger.error("Error eliminando afiliado:", err);
            toast.error("Error eliminando afiliado");
        }
    };

    if (user?.role !== "gerencia") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
                <motion.div
                    className="bg-white p-8 rounded-lg shadow-xl max-w-md text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600">
                        Esta funcionalidad está restringida exclusivamente a usuarios con rol <strong>Gerencia</strong>.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <motion.div
            className="p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center justify-between mb-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold">🗂️ Base de Afiliados</h1>
                    <p className="text-sm text-gray-600">Gestión centralizada de afiliados para campañas de mensajería</p>
                    {stats && (
                        <p className="text-sm text-blue-600 font-semibold mt-1">
                            Total: {stats.total} afiliados registrados
                        </p>
                    )}
                </motion.div>

                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <button
                        onClick={() => {
                            // Limpiar todos los estados
                            setAffiliates([]);
                            setStats(null);
                            setPagination({ page: 1, limit: 50, total: 0, pages: 0 });
                            setLastUploadResult(null);
                            setExports([]);
                            setCurrentConfig(null);
                            
                            // Limpiar localStorage relacionado
                            Object.keys(localStorage).forEach(key => {
                                if (key.includes('affiliate') || key.includes('Affiliate')) {
                                    localStorage.removeItem(key);
                                }
                            });
                            
                            // Forzar recarga desde servidor
                            loadStats();
                            if (activeTab === "search") {
                                searchAffiliates(1);
                            }
                            
                            toast.success("🗑️ Caché completamente limpiado - página recargada");
                            
                            // Recargar página después de 1 segundo
                            setTimeout(() => window.location.reload(), 1000);
                        }}
                        className="px-3 py-2 rounded text-white bg-orange-500 hover:bg-orange-600 text-sm flex items-center gap-1"
                        title="Limpiar caché y recargar datos"
                    >
                        🗑️ Limpiar Caché
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
                    >
                        ← Volver al Menú
                    </button>
                </motion.div>
            </div>

            <motion.div
                className="bg-white rounded shadow mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <div className="flex border-b overflow-x-auto">
                        {[
                            { id: "upload", icon: "📤", label: "Cargar Archivo" },
                            { id: "search", icon: "🔍", label: "Buscar Afiliados" },
                            { id: "config", icon: "⚙️", label: "Configuración de Envíos" },
                            { id: "exports", icon: "📁", label: "Exportaciones" },
                            { id: "stats", icon: "📊", label: "Estadísticas" }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 font-semibold whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? "text-blue-600 border-b-2 border-blue-600"
                                        : "text-gray-600 hover:text-blue-600"
                                }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                </div>

                <div className="p-6">
                        <AnimatePresence mode="wait">
                            {activeTab === "upload" && (
                                <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <h2 className="text-xl font-bold mb-4">Cargar Archivo de Afiliados</h2>
                                    
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h3 className="font-semibold text-blue-900 mb-2">📋 Requisitos del archivo:</h3>
                                        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                                            <li><strong>Formato:</strong> .xlsx o .xls</li>
                                            <li><strong>Campos obligatorios:</strong> Nombre, CUIL, Obra Social, Localidad, Teléfono_1</li>
                                            <li><strong>Campos opcionales:</strong> Teléfono_2, Teléfono_3, Edad, Código de obra social</li>
                                            <li><strong>Tolerancia de headers:</strong> Acepta variantes (ej: "nombre", "Name", "NOMBRE")</li>
                                        </ul>
                                    </div>

                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        
                                        {!file ? (
                                            <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                                                <div className="text-6xl mb-4">📄</div>
                                                <p className="text-lg font-semibold text-gray-700 mb-2">
                                                    Click aquí para seleccionar archivo
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    O arrastra y suelta tu archivo .xlsx
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="text-6xl mb-4">✅</div>
                                                <p className="text-lg font-semibold text-gray-700 mb-2">
                                                    {file.name}
                                                </p>
                                                <p className="text-sm text-gray-500 mb-4">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                                <div className="flex gap-3 justify-center">
                                                    <button
                                                        onClick={() => setFile(null)}
                                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                                    >
                                                        Cambiar archivo
                                                    </button>
                                                    <button
                                                        onClick={handleUpload}
                                                        disabled={loading}
                                                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        {loading ? "Procesando..." : "📤 Subir y Procesar"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {uploadProgress && (
                                        <div className="mt-4">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-semibold">Progreso</span>
                                                <span className="text-sm font-semibold">{uploadProgress.current}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                <div
                                                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                                    style={{ width: `${uploadProgress.current}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Resumen del último upload */}
                                    {lastUploadResult && (
                                        <motion.div
                                            className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300 shadow-md"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                                    📊 Resultado de la Última Carga
                                                </h3>
                                                <button
                                                    onClick={() => setLastUploadResult(null)}
                                                    className="text-gray-500 hover:text-gray-700"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div className="bg-white p-3 rounded shadow-sm">
                                                    <div className="text-2xl font-bold text-green-600">{lastUploadResult.imported}</div>
                                                    <div className="text-sm text-gray-600">✅ Importados</div>
                                                </div>
                                                <div className="bg-white p-3 rounded shadow-sm">
                                                    <div className="text-2xl font-bold text-red-600">{lastUploadResult.rejected}</div>
                                                    <div className="text-sm text-gray-600">❌ Rechazados/Duplicados</div>
                                                </div>
                                                <div className="bg-white p-3 rounded shadow-sm">
                                                    <div className="text-2xl font-bold text-blue-600">{lastUploadResult.total}</div>
                                                    <div className="text-sm text-gray-600">📋 Total en Archivo</div>
                                                </div>
                                            </div>

                                            {lastUploadResult.duplicatesReport && lastUploadResult.rejected > 0 && (
                                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm font-semibold text-yellow-800">
                                                                ⚠️ Se encontraron {lastUploadResult.rejected} registros rechazados
                                                            </p>
                                                            <p className="text-xs text-yellow-700 mt-1">
                                                                Descarga el reporte para ver los detalles de cada rechazo (CUIL duplicado, teléfono duplicado, campos faltantes, etc.)
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    logger.info("Intentando descargar reporte desde:", lastUploadResult.duplicatesReport);
                                                                    const response = await apiClient.get(lastUploadResult.duplicatesReport, {
                                                                        responseType: 'blob'
                                                                    });
                                                                    
                                                                    if (response.data.size === 0) {
                                                                        throw new Error("El archivo está vacío");
                                                                    }
                                                                    
                                                                    const url = window.URL.createObjectURL(new Blob([response.data]));
                                                                    const link = document.createElement('a');
                                                                    link.href = url;
                                                                    link.setAttribute('download', `reporte_duplicados_${new Date().getTime()}.xlsx`);
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    link.remove();
                                                                    window.URL.revokeObjectURL(url);
                                                                    toast.success("✅ Reporte descargado exitosamente");
                                                                } catch (err) {
                                                                    logger.error("Error descargando reporte:", err);
                                                                    if (err.response?.status === 404) {
                                                                        toast.error("❌ El archivo de reporte ya no existe. Genera uno nuevo subiendo un archivo.");
                                                                    } else {
                                                                        toast.error(`❌ Error descargando reporte: ${err.message}`);
                                                                    }
                                                                }
                                                            }}
                                                            className="ml-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold whitespace-nowrap shadow-md"
                                                        >
                                                            📥 Descargar Reporte
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {lastUploadResult.rejected === 0 && (
                                                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                                                    <p className="text-sm font-semibold text-green-800">
                                                        ✅ Todos los registros fueron importados exitosamente sin duplicados ni errores
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === "search" && (
                                <motion.div key="search" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold">Buscar y Filtrar Afiliados</h2>
                                        <button
                                            onClick={() => {
                                                setAffiliates([]);
                                                setPagination({ page: 1, limit: 50, total: 0, pages: 0 });
                                                loadStats();
                                                searchAffiliates(1);
                                                toast.info("🔄 Datos recargados");
                                            }}
                                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                                        >
                                            🔄 Recargar Datos
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Búsqueda por Nombre, CUIL o Teléfono</label>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Buscar..."
                                                className="w-full border rounded px-3 py-2"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">Filtrar por Obra Social</label>
                                            <select
                                                value={selectedObraSocial}
                                                onChange={(e) => setSelectedObraSocial(e.target.value)}
                                                className="w-full border rounded px-3 py-2"
                                            >
                                                <option value="all">Todas las obras sociales</option>
                                                {stats?.obrasSociales?.map((os) => (
                                                    <option key={os.name} value={os.name}>
                                                        {os.name} ({os.count})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-4 py-2 text-left">Nombre</th>
                                                    <th className="px-4 py-2 text-left">CUIL</th>
                                                    <th className="px-4 py-2 text-left">Obra Social</th>
                                                    <th className="px-4 py-2 text-left">Teléfono</th>
                                                    <th className="px-4 py-2 text-left">Localidad</th>
                                                    <th className="px-4 py-2 text-left">Cargado</th>
                                                    <th className="px-4 py-2 text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {affiliates.map((aff) => (
                                                    <tr key={aff._id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2">{aff.nombre}</td>
                                                        <td className="px-4 py-2 font-mono text-sm">{aff.cuil}</td>
                                                        <td className="px-4 py-2">{aff.obraSocial}</td>
                                                        <td className="px-4 py-2">{aff.telefono1}</td>
                                                        <td className="px-4 py-2">{aff.localidad}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-600">
                                                            {new Date(aff.uploadDate).toLocaleDateString("es-AR")}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                onClick={() => deleteAffiliate(aff._id)}
                                                                className="text-red-600 hover:text-red-800"
                                                                title="Eliminar"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        {affiliates.length === 0 && !loading && (
                                            <div className="text-center py-8 text-gray-500">
                                                No se encontraron afiliados
                                            </div>
                                        )}
                                    </div>

                                    {pagination.pages > 1 && (
                                        <div className="flex justify-center gap-2 mt-6">
                                            <button
                                                onClick={() => searchAffiliates(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                                className="px-4 py-2 border rounded disabled:opacity-50"
                                            >
                                                Anterior
                                            </button>
                                            <span className="px-4 py-2">
                                                Página {pagination.page} de {pagination.pages}
                                            </span>
                                            <button
                                                onClick={() => searchAffiliates(pagination.page + 1)}
                                                disabled={pagination.page === pagination.pages}
                                                className="px-4 py-2 border rounded disabled:opacity-50"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === "config" && (
                                <motion.div key="config" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <h2 className="text-xl font-bold mb-4">Configuración de Envíos Programados</h2>
                                    
                                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <p className="text-sm text-yellow-800">
                                            ℹ️ Los archivos CSV se generarán automáticamente cada día a la hora indicada y se enviarán a todos los <strong>Supervisores</strong> vía mensajería interna.
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Cantidad de afiliados por archivo
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10000"
                                                value={exportConfig.affiliatesPerFile}
                                                onChange={(e) => setExportConfig(prev => ({
                                                    ...prev,
                                                    affiliatesPerFile: parseInt(e.target.value)
                                                }))}
                                                className="w-full md:w-64 border rounded px-3 py-2"
                                            />
                                            <p className="text-sm text-gray-600 mt-1">
                                                Si hay {stats?.total || 0} afiliados, se generarán {Math.ceil((stats?.total || 0) / exportConfig.affiliatesPerFile)} archivo(s)
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold mb-2">
                                                Hora de envío diario (HH:mm)
                                            </label>
                                            <input
                                                type="time"
                                                value={exportConfig.scheduledTime}
                                                onChange={(e) => setExportConfig(prev => ({
                                                    ...prev,
                                                    scheduledTime: e.target.value
                                                }))}
                                                className="w-full md:w-64 border rounded px-3 py-2"
                                            />
                                        </div>

                                        {currentConfig && (
                                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                <h3 className="font-semibold text-green-900 mb-2">✅ Configuración Actual</h3>
                                                <ul className="text-sm text-green-800 space-y-1">
                                                    <li>• {currentConfig.affiliatesPerFile} afiliados por archivo</li>
                                                    <li>• Envío diario a las {currentConfig.scheduledTime}</li>
                                                    {currentConfig.lastExecuted && (
                                                        <li>• Última ejecución: {new Date(currentConfig.lastExecuted).toLocaleString("es-AR")}</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleSaveExportConfig}
                                            disabled={loading}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                                        >
                                            {loading ? "Guardando..." : "💾 Guardar Configuración"}
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === "exports" && (
                                <motion.div key="exports" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <h2 className="text-xl font-bold mb-4">Archivos Exportados</h2>
                                    
                                    {exports.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            No hay exportaciones disponibles todavía
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {exports.map((exp, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                                    <div>
                                                        <div className="font-semibold">{exp.filename}</div>
                                                        <div className="text-sm text-gray-600">
                                                            {new Date(exp.createdAt).toLocaleString("es-AR")} • {(exp.size / 1024).toFixed(2)} KB
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={`${apiClient.defaults.baseURL}${exp.downloadUrl}`}
                                                        download
                                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                    >
                                                        📥 Descargar
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === "stats" && stats && (
                                <motion.div key="stats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                                    <h2 className="text-xl font-bold mb-4">Estadísticas de la Base</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg">
                                            <div className="text-5xl font-bold mb-2">{stats.total}</div>
                                            <div className="text-blue-100">Afiliados Totales</div>
                                        </div>

                                        <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                                            <h3 className="font-semibold text-gray-800 mb-3">Top Obras Sociales</h3>
                                            <div className="space-y-2">
                                                {stats.obrasSociales.slice(0, 5).map((os) => (
                                                    <div key={os.name} className="flex justify-between">
                                                        <span className="text-gray-700">{os.name}</span>
                                                        <span className="font-semibold text-blue-600">{os.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-white border-2 border-gray-200 p-6 rounded-lg md:col-span-2">
                                            <h3 className="font-semibold text-gray-800 mb-3">Cargas Recientes</h3>
                                            <div className="space-y-2">
                                                {stats.recentBatches.map((batch) => (
                                                    <div key={batch._id} className="flex justify-between items-center py-2 border-b">
                                                        <div>
                                                            <div className="font-medium">{batch.sourceFile}</div>
                                                            <div className="text-sm text-gray-600">
                                                                {new Date(batch.uploadDate).toLocaleString("es-AR")}
                                                            </div>
                                                        </div>
                                                        <div className="text-blue-600 font-semibold">{batch.count} registros</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
}
