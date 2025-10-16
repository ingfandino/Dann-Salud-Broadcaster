// frontend/src/pages/FollowUp.jsx

import React, { useEffect, useState } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import AuditEditModal from "../components/AuditEditModal";
import * as XLSX from "xlsx";

const ARGENTINE_OBRAS_SOCIALES = [
    "PAMI", "OSDE", "Swiss Medical", "Galeno", "Medifé", "OSDEPYM", "IOMA",
    "OSSEG", "OSDE 210", "OSFATUN", "OSDE GBA", "OSECAC", "OSPRERA",
    "OMINT", "OSSEGUR", "OSPR", "OSUTGRA"
];
const OBRAS_VENDIDAS = ["Binimed", "Meplife", "Medicenter"];
const STATUS_OPTIONS = [
    "Mensaje enviado", "En videollamada", "Rechazada",
    "Falta documentación", "Falta clave", "Reprogramada", "Completa", "QR hecho"
];
const TIPO_VENTA = ["alta", "cambio"];

export default function FollowUp() {
    // Filtros textuales (mantengo las keys que ya tenías: afiliado, cuil, obraAnterior...)
    const [audits, setAudits] = useState([]);
    const [filters, setFilters] = useState({
        afiliado: "",
        cuil: "",
        obraAnterior: "",
        obraVendida: "",
        estado: "",
        tipo: "",
        asesor: "",
        grupo: "",
        datos: "",
        auditor: "",
    });

    // Fecha para consultar histórico (YYYY-MM-DD). Default: hoy
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const [selectedAudit, setSelectedAudit] = useState(null);
    const [loading, setLoading] = useState(false);

    const buildParams = () => {
        const params = { ...filters };

        if (dateFrom && dateTo) {
            params.dateFrom = dateFrom;
            params.dateTo = dateTo;
        } else if (!dateFrom && !dateTo) {
            // si no hay rango, mandar día actual
            params.date = new Date().toISOString().split("T")[0];
        }

        Object.keys(params).forEach(k => {
            if (params[k] === "" || params[k] === null || params[k] === undefined) {
                delete params[k];
            }
        });
        return params;
    };

    const fetchAudits = async () => {
        try {
            setLoading(true);
            const params = buildParams();
            const { data } = await apiClient.get("/audits", { params });
            // data viene ya como array (getAuditsByDate devuelve []), si no festejamos
            setAudits(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error("Error al cargar auditorías");
            setAudits([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // carga inicial: trae auditorías del día por defecto (date = hoy)
        fetchAudits();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const clearFilters = () => {
        setFilters({
            afiliado: "",
            cuil: "",
            obraAnterior: "",
            obraVendida: "",
            estado: "",
            tipo: "",
            asesor: "",
            grupo: "",
            datos: "",
            auditor: "",
        });
        // Resetea rango → fuerza al buildParams a usar "date = hoy"
        setDateFrom("");
        setDateTo("");
    };

    const handleExportXLSX = () => {
        if (!audits || audits.length === 0) {
            toast.info("No hay datos para exportar");
            return;
        }

        // Normalizar/planificar columnas para Excel
        const rows = audits.map(a => ({
            Fecha: a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString("es-AR") : "-",
            Hora: a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-",
            Afiliado: a.nombre || "-",
            CUIL: a.cuil || "-",
            Teléfono: a.telefono || "-",
            "Obra Social Anterior": a.obraSocialAnterior || "-",
            "Obra Social Vendida": a.obraSocialVendida || "-",
            Estado: a.status || "-",
            Tipo: a.tipoVenta || "-",
            Asesor: (a.asesor && (a.asesor.email || a.asesor.nombre || a.asesor.name)) || "-",
            Grupo: (a.groupId && (a.groupId.nombre || a.groupId.name)) || "-",
            Auditor: (a.auditor && (a.auditor.email || a.auditor.nombre || a.auditor.name)) || "-"
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Auditorías");
        const today = new Date().toISOString().slice(0, 10);
        const filename = `audits_${dateFrom || today}.xlsx`;
        XLSX.writeFile(wb, filename);

        toast.success("Exportado correctamente");
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Rechazada":
                return "bg-red-100 text-red-700";
            case "Completa":
                return "bg-green-100 text-green-700";
            case "Mensaje enviado":
                return "bg-blue-100 text-blue-700";
            case "En videollamada":
                return "bg-indigo-100 text-indigo-700";
            case "Falta documentación":
                return "bg-yellow-100 text-yellow-700";
            case "Falta clave":
                return "bg-orange-100 text-orange-700";
            case "Reprogramada":
                return "bg-purple-100 text-purple-700";
            default:
                return "bg-gray-100 text-gray-700";
            case "QR hecho":
                return "bg-pink-100 text-green-700";
        }
    };

    return (
        <div className="p-6 bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen">
            {/* Caja de Filtros */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Filtros</h2>

                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Buscar afiliado"
                        value={filters.afiliado}
                        onChange={(e) => handleFilterChange("afiliado", e.target.value)}
                        className="flex-1 min-w-[160px] p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Buscar CUIL"
                        value={filters.cuil}
                        onChange={(e) => handleFilterChange("cuil", e.target.value)}
                        className="flex-1 min-w-[140px] p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <select
                        value={filters.obraAnterior}
                        onChange={(e) => handleFilterChange("obraAnterior", e.target.value)}
                        className="flex-1 min-w-[180px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Obra social anterior</option>
                        {ARGENTINE_OBRAS_SOCIALES.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <select
                        value={filters.obraVendida}
                        onChange={(e) => handleFilterChange("obraVendida", e.target.value)}
                        className="flex-1 min-w-[180px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Obra social vendida</option>
                        {OBRAS_VENDIDAS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <select
                        value={filters.estado}
                        onChange={(e) => handleFilterChange("estado", e.target.value)}
                        className="flex-1 min-w-[150px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Estado</option>
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <select
                        value={filters.tipo}
                        onChange={(e) => handleFilterChange("tipo", e.target.value)}
                        className="flex-1 min-w-[120px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Tipo</option>
                        {TIPO_VENTA.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Asesor"
                        value={filters.asesor}
                        onChange={(e) => handleFilterChange("asesor", e.target.value)}
                        className="flex-1 min-w-[140px] p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Grupo"
                        value={filters.grupo}
                        onChange={(e) => handleFilterChange("grupo", e.target.value)}
                        className="flex-1 min-w-[140px] p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Auditor"
                        value={filters.auditor}
                        onChange={(e) => handleFilterChange("auditor", e.target.value)}
                        className="flex-1 min-w-[140px] p-2 border border-gray-200 rounded-lg text-sm"
                    />

                    {/* Fecha (botón calendario) */}
                    <div className="flex items-center gap-2 min-w-[320px]">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Desde</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="p-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Hasta</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="p-2 border border-gray-200 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={fetchAudits}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition"
                    >
                        Aplicar filtros
                    </button>
                    <button
                        onClick={clearFilters}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition"
                    >
                        Limpiar
                    </button>

                    <button
                        onClick={handleExportXLSX}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition"
                    >
                        Exportar .xlsx
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-3 overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-blue-100 text-gray-700 font-semibold text-center">
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Hora</th>
                            <th className="px-3 py-2">Afiliado</th>
                            <th className="px-3 py-2">Teléfono</th>
                            <th className="px-3 py-2">CUIL</th>
                            <th className="px-3 py-2">Obra Social Anterior</th>
                            <th className="px-3 py-2">Obra Social Vendida</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Asesor</th>
                            <th className="px-3 py-2">Grupo</th>
                            <th className="px-3 py-2">Datos extra</th>
                            <th className="px-3 py-2">Auditor</th>
                            <th className="px-3 py-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" className="text-center text-gray-500 py-4">
                                    Cargando datos...
                                </td>
                            </tr>
                        ) : audits.length === 0 ? (
                            <tr>
                                <td colSpan="11" className="text-center text-gray-500 py-4 italic">
                                    No hay registros que coincidan con los filtros.
                                </td>
                            </tr>
                        ) : (
                            audits.map((audit) => (
                                <tr
                                    key={audit._id}
                                    className="hover:bg-blue-50 transition border-b border-gray-100 text-center"
                                >
                                    <td className="px-3 py-2 text-gray-600">
                                        {audit.scheduledAt
                                            ? new Date(audit.scheduledAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2 text-gray-600">
                                        {audit.scheduledAt
                                            ? new Date(audit.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2">{audit.nombre || "-"}</td>
                                    <td className="px-3 py-2">{audit.telefono || "-"}</td>
                                    <td className="px-3 py-2">{audit.cuil || "-"}</td>
                                    <td className="px-3 py-2">{audit.obraSocialAnterior || "-"}</td>
                                    <td className="px-3 py-2">{audit.obraSocialVendida || "-"}</td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={`inline-flex items-center justify-center px-3 py-1 rounded text-xs font-medium ${getStatusColor(audit.status)}`}
                                            style={{ minWidth: "110px" }}
                                        >
                                            {audit.status || "-"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">{audit.tipoVenta || "-"}</td>
                                    <td className="px-3 py-2">
                                        {audit.asesor?.email || audit.asesor?.nombre || audit.asesor?.name || "-"}
                                    </td>
                                    <td className="px-3 py-2">
                                        {audit.groupId?.nombre || audit.groupId?.name || "-"}
                                    </td>
                                    <td className="px-3 py-2">
                                        {audit.datosExtra || "-"}
                                    </td>
                                    <td className="px-3 py-2">
                                        {audit.auditor?.email || audit.auditor?.nombre || audit.auditor?.name || "-"}
                                    </td>
                                    <td className="px-3 py-2">
                                        <button
                                            onClick={() => setSelectedAudit(audit)}
                                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-md transition"
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedAudit && (
                <AuditEditModal
                    audit={selectedAudit}
                    onClose={() => setSelectedAudit(null)}
                    onSave={fetchAudits}
                />
            )}
        </div>
    );
}