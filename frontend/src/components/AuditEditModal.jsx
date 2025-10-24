// frontend/src/components/AuditEditModal.jsx

import React, { useState, useEffect } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import NotificationService from "../services/NotificationService";

const STATUS_OPTIONS = [
    "Mensaje enviado",
    "En videollamada",
    "Rechazada",
    "Falta documentación",
    "Falta clave",
    "Reprogramada",
    "Completa",
    "QR hecho",
];
const ARGENTINE_OBRAS_SOCIALES = [
    'OSDE', 'Medifé', 'OSDEPYM', 'IOMA', 'OSSEG', 'OSDE 210',
    'OSFATUN', 'OSDE GBA', 'OSECAC', 'OSPRERA', 'OMINT', 'OSSEGUR',
    'OSPR', 'OSUTHGRA', 'OSBLYCA', 'UOM', 'OSPM', 'OSPECON', 'Elevar', 'OSCHOCA',
    'OSPEP'
];
const OBRAS_VENDIDAS = ["Binimed", "Meplife", "Medicenter"];
const TIPO_VENTA = ["Alta", "Cambio"];

export default function AuditEditModal({ audit, onClose, onSave }) {
    const [form, setForm] = useState({
        nombre: audit.nombre || "",
        cuil: audit.cuil || "",
        telefono: audit.telefono || "",
        obraSocialAnterior: audit.obraSocialAnterior || "",
        obraSocialVendida: audit.obraSocialVendida || "",
        status: audit.status || "",
        tipoVenta: audit.tipoVenta || "alta",
        asesor: audit.asesor?.nombre || audit.asesor || "",
        grupo: audit.groupId?.nombre || audit.groupId?.name || audit.grupo || "",
        auditor: audit.auditor?._id || audit.auditor || "",
        fecha: audit.scheduledAt ? audit.scheduledAt.split("T")[0] : "",
        hora: audit.scheduledAt ? audit.scheduledAt.split("T")[1]?.slice(0, 5) : "",
        datosExtra: audit.datosExtra || "",
    });

    const [loading, setLoading] = useState(false);
    const [reprogramar, setReprogramar] = useState(false);

    const [auditores, setAuditores] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);


    useEffect(() => {
        if (form.fecha) fetchAvailableSlots(form.fecha);
    }, [form.fecha]);

    async function fetchAvailableSlots(date) {
        setLoadingSlots(true);
        try {
            const res = await apiClient.get(`/audits/available-slots?date=${date}`);
            setAvailableSlots(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error("No se pudieron cargar los turnos disponibles");
        } finally {
            setLoadingSlots(false);
        }
    }

    function generateTimeOptions() {
        const options = [];
        const start = new Date();
        start.setHours(9, 20, 0, 0);
        const end = new Date();
        end.setHours(21, 0, 0, 0);
        let cur = new Date(start);
        while (cur <= end) {
            const hh = String(cur.getHours()).padStart(2, "0");
            const mm = String(cur.getMinutes()).padStart(2, "0");
            options.push(`${hh}:${mm}`);
            cur.setMinutes(cur.getMinutes() + 20);
        }
        return options;
    }

    function getEnabledTimeOptions() {
        const all = generateTimeOptions();
        const map = {};
        (availableSlots || []).forEach((s) => { map[s.time] = s.count; });
        return all.map((t) => ({ time: t, disabled: (map[t] || 0) >= 4 }));
    }
    const timeOptions = getEnabledTimeOptions();

    useEffect(() => {
        const fetchAuditores = async () => {
            try {
                const { data } = await apiClient.get("/users", {
                    params: { roles: ["supervisor", "auditor", "administrador"] },
                });
                setAuditores(data);
            } catch (err) {
                console.error("Error al cargar auditores", err);
                toast.error("No se pudieron cargar los auditores");
            }
        };
        fetchAuditores();
    }, []);

    const validate = () => {
        if (!form.nombre.trim()) return "Nombre es requerido";
        if (!/^\d{11}$/.test(form.cuil)) return "CUIL debe tener exactamente 11 dígitos";
        if (form.telefono && !/^\d{10}$/.test(form.telefono.replace(/\D/g, '')))
            return "Teléfono debe tener 10 dígitos";
        if (reprogramar && form.fecha && form.hora) {
            const now = new Date();
            const selected = new Date(`${form.fecha}T${form.hora}:00`);
            if (selected < now) return "No se puede asignar un turno en el pasado";
        }
        return null;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const err = validate();
        if (err) { toast.error(err); return; }

        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre?.trim() || "",
                cuil: form.cuil?.trim() || "",
                telefono: form.telefono?.trim() || "",
                status: form.status || "",
                tipoVenta: form.tipoVenta?.toLowerCase() || "alta",
                obraSocialAnterior: form.obraSocialAnterior || "",
                obraSocialVendida: form.obraSocialVendida || "",
                auditor: form.auditor || "",
                scheduledAt: reprogramar && form.fecha && form.hora ? `${form.fecha}T${form.hora}:00` : audit.scheduledAt,
                datosExtra: form.datosExtra?.trim() || ""
            };

            await apiClient.patch(`/audits/${audit._id}`, payload);
            toast.success("Auditoría actualizada");
            NotificationService.success("Una auditoría fue editada correctamente");
            onSave();
            onClose();
        } catch (err) {
            console.error("Error al actualizar auditoría:", err.response?.data || err.message);
            toast.error("No se pudo actualizar la auditoría");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-4">
                <h2 className="text-lg font-semibold mb-4">Editar Auditoría</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Afiliado</label>
                        <input
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange}
                            className="border rounded p-2 w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Teléfono</label>
                        <input
                            name="telefono"
                            value={form.telefono || ""}
                            onChange={handleChange}
                            className="border rounded p-2 w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">CUIL</label>
                        <input
                            name="cuil"
                            value={form.cuil}
                            onChange={handleChange}
                            className="border rounded p-2 w-full"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium">Obra Social Anterior</label>
                            <select
                                name="obraSocialAnterior"
                                value={form.obraSocialAnterior}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            >
                                <option value="">-- Seleccionar --</option>
                                {ARGENTINE_OBRAS_SOCIALES.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Obra Social Vendida</label>
                            <select
                                name="obraSocialVendida"
                                value={form.obraSocialVendida}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            >
                                {OBRAS_VENDIDAS.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium">Estado</label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            >
                                <option value="">Seleccione</option>
                                {STATUS_OPTIONS.map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Tipo</label>
                            <select
                                name="tipoVenta"
                                value={form.tipoVenta}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            >
                                {TIPO_VENTA.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-sm font-medium">Asesor</label>
                            <input
                                name="asesor"
                                value={form.asesor}
                                readOnly
                                className="border rounded p-2 w-full bg-gray-100 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Grupo</label>
                            <input
                                name="grupo"
                                value={form.grupo}
                                readOnly
                                className="border rounded p-2 w-full bg-gray-100 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Auditor</label>
                            <select
                                name="auditor"
                                value={form.auditor}
                                onChange={handleChange}
                                className="border rounded p-2 w-full"
                            >
                                <option value="">Seleccione</option>
                                {auditores.map((u) => (
                                    <option key={u._id} value={u._id}>
                                        {u.nombre || u.email || u.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium">Fecha (día)</label>
                            <input
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                value={form.fecha}
                                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                className={`border rounded p-2 w-full ${!reprogramar ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                disabled={!reprogramar}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Hora (turno)</label>
                            <select
                                value={form.hora}
                                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                                className={`border rounded p-2 w-full ${!reprogramar ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                disabled={!reprogramar}
                            >
                                <option value="">-- Seleccionar --</option>
                                {loadingSlots ? (
                                    <option>cargando...</option>
                                ) : (
                                    timeOptions.map((t) => (
                                        <option key={t.time} value={t.time} disabled={t.disabled}>
                                            {t.time}{t.disabled ? " (completo)" : ""}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="chk-reprogramar"
                            type="checkbox"
                            checked={reprogramar}
                            onChange={(e) => setReprogramar(e.target.checked)}
                            className="h-4 w-4"
                        />
                        <label htmlFor="chk-reprogramar" className="text-sm">Reprogramar turno (habilita edición de fecha y hora)</label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Datos extra</label>
                        <textarea
                            name="datosExtra"
                            value={form.datosExtra}
                            onChange={handleChange}
                            placeholder="Ejemplo: Afiliado con familiares, enfermedad preexistente, observaciones..."
                            className="border rounded p-2 w-full min-h-[70px]"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-2 rounded bg-gray-300 hover:bg-gray-400"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}