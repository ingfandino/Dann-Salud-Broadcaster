// frontend/src/pages/Reports.jsx

import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logger from "../utils/logger";

const USE_MOCK = false;

// Helpers
function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es-AR"); // dd/mm/aaaa
}
function toYMD(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0]; // yyyy-mm-dd
}

// Mock generator
function generateMockReports(n = 50) {
    const obras = ["OSDE", "Swiss Medical", "Galeno", "Medicus", "OSF"];
    const names = ["Ana Pérez", "Juan Gómez", "María López", "Carlos Díaz", "Lucía Ruiz"];
    const asesores = ["Sofía", "Martín", "Luciano", "Valeria"];
    const grupos = ["Grupo Norte", "Grupo Sur", "Grupo Oeste"];

    const out = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
        const daysBack = Math.floor(Math.random() * 20);
        const d = new Date(today);
        d.setDate(d.getDate() - daysBack);

        const responded = Math.random() > 0.6; // ~40% no responde
        out.push({
            _id: `r_${i}`,
            fecha: d.toISOString(),
            telefono: "+54" + (900000000 + Math.floor(Math.random() * 9000000)).toString(),
            nombre: names[i % names.length] + ` ${i}`,
            obraSocial: obras[i % obras.length],
            respondio: responded,
            asesorNombre: asesores[i % asesores.length],
            grupo: grupos[i % grupos.length],
        });
    }
    return out;
}

export default function Reports() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        asesor: "",
        grupo: "",
        q: "",
    });
    const [page, setPage] = useState(1);
    const [perPage] = useState(10);

    useEffect(() => {
        if (USE_MOCK) {
            setReports(generateMockReports(80));
        } else {
            fetchReports();
        }
        // eslint-disable-next-line
    }, []);

    const fetchReports = async () => {
        try {
            const res = await apiClient.get("/reports", { params: filters });
            setReports(res.data || []);
            setPage(1);
        } catch (err) {
            logger.error("❌ Error cargando reportes:", err);
        }
    };

    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // Filtrado en memoria
    const filtered = useMemo(() => {
        const { startDate, endDate, asesor, grupo, q } = filters;
        let out = [...reports];

        if (startDate) {
            out = out.filter((r) => toYMD(r.fecha) >= startDate);
        }
        if (endDate) {
            out = out.filter((r) => toYMD(r.fecha) <= endDate);
        }
        if (asesor) {
            out = out.filter((r) => (r.asesorNombre || "").toLowerCase().includes(asesor.toLowerCase()));
        }
        if (grupo) {
            out = out.filter((r) => (r.grupo || "").toLowerCase().includes(grupo.toLowerCase()));
        }
        if (q) {
            const qq = q.toLowerCase();
            out = out.filter(
                (r) =>
                    (r.nombre || "").toLowerCase().includes(qq) ||
                    (r.telefono || "").toLowerCase().includes(qq)
            );
        }
        return out.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [reports, filters]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const current = filtered.slice((page - 1) * perPage, page * perPage);

    // Exportar a Excel (.xls)
    const exportXLS = () => {
        if (filtered.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const headers = ["Fecha", "Teléfono", "Nombre", "Obra social", "¿Respondió?", "Asesor", "Grupo"];

        const rows = filtered.map((r) => [
            formatDate(r.fecha),
            r.telefono ?? "",
            r.nombre ?? "",
            r.obraSocial ?? "",
            r.respondio ? "Sí" : "No",
            r.asesorNombre ?? "",
            r.grupo ?? "",
        ]);

        const table =
            "<table><thead><tr>" +
            headers.map((h) => `<th>${h}</th>`).join("") +
            "</tr></thead><tbody>" +
            rows
                .map(
                    (row) =>
                        "<tr>" +
                        row.map((cell) => `<td>${(cell ?? "").toString().replace(/</g, "&lt;")}</td>`).join("") +
                        "</tr>"
                )
                .join("") +
            "</tbody></table>";

        const html =
            "<html xmlns:x='urn:schemas-microsoft-com:office:excel'><head><meta charset='utf-8'></head><body>" +
            table +
            "</body></html>";

        const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const nameSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        a.href = url;
        a.download = `reporte_mensajeria_${nameSuffix}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

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
                    <h1 className="text-2xl font-bold">📑 Reporte de mensajería</h1>
                    <p className="text-sm text-gray-600">Censo de contactos y respuesta por asesor</p>
                </motion.div>

                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
                    >
                        ← Volver al Menú
                    </button>

                    <button
                        onClick={exportXLS}
                        className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                        Exportar .xls
                    </button>
                </motion.div>
            </div>

            {/* Filtros */}
            <motion.div
                className="bg-white p-4 rounded shadow mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="font-semibold mb-2">Filtros</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleChange}
                        className="border p-2 rounded" />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleChange}
                        className="border p-2 rounded" />
                    <input type="text" name="asesor" placeholder="Filtrar por asesor" value={filters.asesor}
                        onChange={handleChange} className="border p-2 rounded" />
                    <input type="text" name="grupo" placeholder="Filtrar por grupo" value={filters.grupo}
                        onChange={handleChange} className="border p-2 rounded" />

                    <input type="text" name="q" placeholder="Buscar por nombre o teléfono" value={filters.q}
                        onChange={handleChange} className="border p-2 rounded md:col-span-2" />
                    <div className="md:col-span-2 flex gap-2">
                        <button onClick={() => { setPage(1); }} className="bg-blue-600 text-white px-4 py-2 rounded">
                            Aplicar filtros
                        </button>
                        <button onClick={() => { setFilters({ startDate: "", endDate: "", asesor: "", grupo: "", q: "" }); setPage(1); }}
                            className="bg-gray-200 px-4 py-2 rounded">
                            Limpiar
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Tabla */}
            <motion.div
                className="bg-white p-4 rounded shadow overflow-x-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                <table className="w-full border">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border p-2 text-left">Fecha</th>
                            <th className="border p-2 text-left">Teléfono</th>
                            <th className="border p-2 text-left">Nombre</th>
                            <th className="border p-2 text-left">Obra social</th>
                            <th className="border p-2 text-left">¿Respondió?</th>
                            <th className="border p-2 text-left">Asesor</th>
                            <th className="border p-2 text-left">Grupo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {current.length > 0 ? (
                            current.map((r) => (
                                <tr key={r._id}>
                                    <td className="border p-2">{formatDate(r.fecha)}</td>
                                    <td className="border p-2">{r.telefono}</td>
                                    <td className="border p-2">{r.nombre}</td>
                                    <td className="border p-2">{r.obraSocial}</td>
                                    <td className="border p-2">{r.respondio ? "Sí" : "No"}</td>
                                    <td className="border p-2">{r.asesorNombre}</td>
                                    <td className="border p-2">{r.grupo}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="p-4 text-center text-gray-500">
                                    No hay datos disponibles
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </motion.div>

            {/* Paginación */}
            <motion.div
                className="mt-4 flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <div className="text-sm text-gray-600">
                    Mostrando {Math.min((page - 1) * perPage + 1, total)} - {Math.min(page * perPage, total)} de {total}
                </div>
                <div className="flex items-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Anterior</button>
                    <span className="px-2">{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Siguiente</button>
                </div>
            </motion.div>
        </motion.div>
    );
}