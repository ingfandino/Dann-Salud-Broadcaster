// frontend/src/pages/BannedWords.jsx

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
    Shield,
    Plus,
    Trash2,
    AlertTriangle,
    Search,
    TrendingUp,
    Calendar,
    User,
    CheckCircle,
    XCircle,
    Filter
} from "lucide-react";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";

export default function BannedWords() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("list");
    const [bannedWords, setBannedWords] = useState([]);
    const [detections, setDetections] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    // Formulario para agregar palabra
    const [newWord, setNewWord] = useState({
        word: "",
        category: "otra",
        severity: "media",
        notes: ""
    });

    // Filtros
    const [filters, setFilters] = useState({
        active: true,
        category: "all",
        search: ""
    });

    useEffect(() => {
        loadBannedWords();
        loadStats();
    }, []);

    useEffect(() => {
        if (activeTab === "detections") {
            loadDetections();
        }
    }, [activeTab]);

    const loadBannedWords = async () => {
        try {
            setLoading(true);
            const params = {
                active: filters.active,
                ...(filters.category !== "all" && { category: filters.category }),
                ...(filters.search && { search: filters.search })
            };

            const res = await apiClient.get("/banned-words", { params });
            setBannedWords(res.data.bannedWords || []);
        } catch (error) {
            logger.error("Error cargando palabras prohibidas:", error);
            toast.error("Error al cargar palabras prohibidas");
        } finally {
            setLoading(false);
        }
    };

    const loadDetections = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/banned-words/detections");
            setDetections(res.data.detections || []);
        } catch (error) {
            logger.error("Error cargando detecciones:", error);
            toast.error("Error al cargar historial");
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const res = await apiClient.get("/banned-words/stats");
            setStats(res.data.stats);
        } catch (error) {
            logger.error("Error cargando estadísticas:", error);
        }
    };

    const handleAddWord = async (e) => {
        e.preventDefault();

        if (!newWord.word.trim()) {
            toast.error("La palabra es obligatoria");
            return;
        }

        try {
            setLoading(true);
            await apiClient.post("/banned-words", newWord);
            toast.success("✅ Palabra agregada correctamente");
            setNewWord({ word: "", category: "otra", severity: "media", notes: "" });
            loadBannedWords();
            loadStats();
        } catch (error) {
            logger.error("Error agregando palabra:", error);
            toast.error(error.response?.data?.message || "Error al agregar palabra");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWord = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar esta palabra?")) return;

        try {
            await apiClient.delete(`/banned-words/${id}`);
            toast.success("Palabra eliminada");
            loadBannedWords();
            loadStats();
        } catch (error) {
            logger.error("Error eliminando palabra:", error);
            toast.error("Error al eliminar palabra");
        }
    };

    const handleResolveDetection = async (id) => {
        try {
            await apiClient.put(`/banned-words/detections/${id}/resolve`, {
                notes: "Revisado por gerencia"
            });
            toast.success("Detección marcada como resuelta");
            loadDetections();
        } catch (error) {
            logger.error("Error resolviendo detección:", error);
            toast.error("Error al resolver detección");
        }
    };

    const getSeverityColor = (severity) => {
        const colors = {
            baja: "bg-green-100 text-green-800",
            media: "bg-yellow-100 text-yellow-800",
            alta: "bg-orange-100 text-orange-800",
            crítica: "bg-red-100 text-red-800"
        };
        return colors[severity] || colors.media;
    };

    const getCategoryIcon = (category) => {
        const icons = {
            ofensiva: "🤬",
            legal: "⚖️",
            competencia: "🏢",
            otra: "⚠️"
        };
        return icons[category] || icons.otra;
    };

    if (user?.role !== "gerencia") {
        return (
            <div className="p-6 text-center">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Acceso denegado. Solo usuarios de Gerencia.</p>
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
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-8 h-8 text-red-600" />
                    <h1 className="text-3xl font-bold">Palabras Prohibidas</h1>
                </div>
                <p className="text-gray-600">
                    Gestiona la lista de palabras prohibidas y revisa alertas de detección
                </p>
            </div>

            <button
                onClick={() => navigate("/")}
                className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
            >
                ← Volver al Menú
            </button>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Total Palabras</p>
                                <p className="text-2xl font-bold">{stats.totalBannedWords}</p>
                            </div>
                            <Shield className="w-8 h-8 text-blue-600" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Activas</p>
                                <p className="text-2xl font-bold text-green-600">{stats.activeBannedWords}</p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Detecciones</p>
                                <p className="text-2xl font-bold text-orange-600">{stats.totalDetections}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-orange-600" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm">Sin Resolver</p>
                                <p className="text-2xl font-bold text-red-600">{stats.unresolvedDetections}</p>
                            </div>
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
                <button
                    onClick={() => setActiveTab("list")}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === "list"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-blue-600"
                        }`}
                >
                    📋 Lista de Palabras
                </button>
                <button
                    onClick={() => setActiveTab("add")}
                    className={`px-4 py-2 font-semibold transition-colors ${activeTab === "add"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-blue-600"
                        }`}
                >
                    ➕ Agregar Palabra
                </button>
                <button
                    onClick={() => setActiveTab("detections")}
                    className={`px-4 py-2 font-semibold transition-colors relative ${activeTab === "detections"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-600 hover:text-blue-600"
                        }`}
                >
                    🚨 Detecciones
                    {stats?.unresolvedDetections > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {stats.unresolvedDetections}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {activeTab === "list" && (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white rounded-lg shadow-lg p-6"
                    >
                        {/* Filtros */}
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Buscar palabra..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        onKeyUp={() => loadBannedWords()}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>

                            <select
                                value={filters.category}
                                onChange={(e) => {
                                    setFilters({ ...filters, category: e.target.value });
                                    loadBannedWords();
                                }}
                                className="border rounded-lg px-4 py-2"
                            >
                                <option value="all">Todas las categorías</option>
                                <option value="ofensiva">Ofensiva</option>
                                <option value="legal">Legal</option>
                                <option value="competencia">Competencia</option>
                                <option value="otra">Otra</option>
                            </select>

                            <button
                                onClick={() => {
                                    setFilters({ ...filters, active: !filters.active });
                                    loadBannedWords();
                                }}
                                className={`px-4 py-2 rounded-lg font-semibold ${filters.active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                            >
                                {filters.active ? "✅ Activas" : "❌ Inactivas"}
                            </button>
                        </div>

                        {/* Lista */}
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : bannedWords.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No hay palabras prohibidas</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {bannedWords.map((word) => (
                                    <motion.div
                                        key={word._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="text-2xl">{getCategoryIcon(word.category)}</span>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-lg">{word.word}</p>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(word.severity)}`}>
                                                        {word.severity}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600">
                                                    Agregada por {word.addedBy?.name} el{" "}
                                                    {new Date(word.createdAt).toLocaleDateString("es-AR")}
                                                </p>
                                                {word.notes && (
                                                    <p className="text-sm text-gray-500 mt-1">📝 {word.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteWord(word._id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === "add" && (
                    <motion.div
                        key="add"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto"
                    >
                        <form onSubmit={handleAddWord} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Palabra Prohibida *
                                </label>
                                <input
                                    type="text"
                                    value={newWord.word}
                                    onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
                                    placeholder="Ej: competidor, ilegal, etc."
                                    className="w-full border rounded-lg px-4 py-2"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Categoría
                                    </label>
                                    <select
                                        value={newWord.category}
                                        onChange={(e) => setNewWord({ ...newWord, category: e.target.value })}
                                        className="w-full border rounded-lg px-4 py-2"
                                    >
                                        <option value="ofensiva">🤬 Ofensiva</option>
                                        <option value="legal">⚖️ Legal</option>
                                        <option value="competencia">🏢 Competencia</option>
                                        <option value="otra">⚠️ Otra</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2">
                                        Severidad
                                    </label>
                                    <select
                                        value={newWord.severity}
                                        onChange={(e) => setNewWord({ ...newWord, severity: e.target.value })}
                                        className="w-full border rounded-lg px-4 py-2"
                                    >
                                        <option value="baja">Baja</option>
                                        <option value="media">Media</option>
                                        <option value="alta">Alta</option>
                                        <option value="crítica">Crítica</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Notas (Opcional)
                                </label>
                                <textarea
                                    value={newWord.notes}
                                    onChange={(e) => setNewWord({ ...newWord, notes: e.target.value })}
                                    placeholder="Motivo o contexto de la prohibición..."
                                    className="w-full border rounded-lg px-4 py-2"
                                    rows={3}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                            >
                                {loading ? "Agregando..." : "➕ Agregar Palabra"}
                            </button>
                        </form>
                    </motion.div>
                )}

                {activeTab === "detections" && (
                    <motion.div
                        key="detections"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white rounded-lg shadow-lg p-6"
                    >
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                        ) : detections.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50 text-green-600" />
                                <p>No hay detecciones registradas</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {detections.map((detection) => (
                                    <motion.div
                                        key={detection._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-4 border rounded-lg ${detection.resolved ? "bg-gray-50" : "bg-red-50 border-red-200"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                                    <span className="font-bold text-lg text-red-700">
                                                        {detection.word}
                                                    </span>
                                                    {detection.resolved && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                                            ✅ Resuelto
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                                    <div>
                                                        <p className="text-gray-600">
                                                            <User className="w-4 h-4 inline mr-1" />
                                                            <strong>Usuario:</strong> {detection.userId?.name} ({detection.userId?.role})
                                                        </p>
                                                        <p className="text-gray-600">
                                                            <strong>Equipo:</strong> {detection.userId?.numeroEquipo || "N/A"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600">
                                                            <strong>Campaña:</strong> {detection.campaignName || "N/A"}
                                                        </p>
                                                        <p className="text-gray-600">
                                                            <Calendar className="w-4 h-4 inline mr-1" />
                                                            {new Date(detection.createdAt).toLocaleString("es-AR")}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-3 rounded border text-sm">
                                                    <p className="text-gray-600"><strong>Contexto:</strong></p>
                                                    <p className="text-gray-800 mt-1">
                                                        "{detection.messageContent.substring(0, 200)}
                                                        {detection.messageContent.length > 200 ? "..." : ""}"
                                                    </p>
                                                </div>
                                            </div>

                                            {!detection.resolved && (
                                                <button
                                                    onClick={() => handleResolveDetection(detection._id)}
                                                    className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
