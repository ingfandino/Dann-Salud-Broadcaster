// frontend/src/components/RecoveryEditModal.jsx

import React, { useState, useEffect } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { X, Trash2 } from "lucide-react";

// ✅ Estados completos de FollowUp.jsx para permitir a admin editar con todas las opciones
const STATUS_OPTIONS = [
    "Falta documentación", "Falta clave", "Falta clave y documentación",
    "Completa", "Rechazó", "QR hecho", "Aprobada",
    "Aprobada, pero no reconoce clave",
    "Cortó", "Autovinculación", "Caída",
    "Pendiente", "Cargada", "Contactado"
];

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"];

export default function RecoveryEditModal({ audit, onClose, onSave }) {
    const { user } = useAuth();
    
    // ✅ Guardar estado original para validar permisos de "Aprobada"
    const wasInCargadaStatus = audit.status === "Cargada";

    const [form, setForm] = useState({
        nombre: audit.nombre || "",
        cuil: audit.cuil || "",
        telefono: audit.telefono || "",
        obraSocialVendida: audit.obraSocialVendida || "",
        status: audit.status || "Pendiente",
        administrador: audit.administrador?._id || audit.administrador || "",
        datosExtra: audit.datosExtra || "",
    });

    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [administradores, setAdministradores] = useState([]);

    useEffect(() => {
        loadAdministradores();
    }, []);

    const loadAdministradores = async () => {
        try {
            const { data } = await apiClient.get('/users');
            const admins = data.filter(u => u.role === 'admin' && u.active);
            setAdministradores(admins);
        } catch (error) {
            console.error('Error cargando administradores:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        if (!form.nombre || !form.nombre.trim()) return "El nombre es requerido";
        if (!form.cuil || !form.cuil.trim()) return "El CUIL es requerido";
        if (!form.telefono || !form.telefono.trim()) return "El teléfono es requerido";
        if (!form.obraSocialVendida) return "La obra social vendida es requerida";
        if (!form.status) return "El estado es requerido";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const err = validate();
        if (err) {
            toast.error(err);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                nombre: form.nombre,
                cuil: form.cuil,
                telefono: form.telefono,
                obraSocialVendida: form.obraSocialVendida,
                status: form.status,
                datosExtra: form.datosExtra,
            };

            // Administrador: permitir asignar, desasignar o mantener
            if (form.administrador === "" || form.administrador === "Seleccione") {
                payload.administrador = null; // Desasignar
            } else if (form.administrador) {
                payload.administrador = form.administrador; // Asignar/cambiar
            }

            const response = await apiClient.patch(`/audits/${audit._id}`, payload);
            console.log('✅ Respuesta del servidor (updateAudit):', response.data);
            toast.success("✅ Recuperación actualizada correctamente");
            onSave(response.data); // Pasar datos actualizados
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Error al actualizar la recuperación");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `¿Estás seguro de que deseas ELIMINAR esta recuperación?\n\n` +
            `Afiliado: ${audit.nombre}\n` +
            `CUIL: ${audit.cuil}\n\n` +
            `Esta acción NO se puede deshacer.`
        );

        if (!confirmed) return;

        setDeleting(true);
        try {
            await apiClient.delete(`/audits/${audit._id}`);
            toast.success("🗑️ Recuperación eliminada correctamente");
            onSave(null, audit._id); // Pasar ID para eliminación
            onClose();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Error al eliminar la recuperación");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Editar Recuperación</h2>
                        <p className="text-sm text-purple-100 mt-1">
                            {audit.nombre} - {audit.cuil}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 p-2 rounded-full transition"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Información Original (Solo lectura) */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <h3 className="font-semibold text-gray-700 mb-3">📋 Información Original</h3>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Asesor original:</span>
                                <span className="ml-2 font-medium">
                                    {audit.asesor?.nombre || audit.asesor?.name || audit.asesor?.email || '-'}
                                </span>
                            </div>
                            
                            <div>
                                <span className="text-gray-500">Supervisor original:</span>
                                <span className="ml-2 font-medium">
                                    {audit.asesor?.supervisor?.nombre || audit.asesor?.supervisor?.name || '-'}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500">Grupo original:</span>
                                <span className="ml-2 font-medium">
                                    {audit.asesor?.numeroEquipo || '-'}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500">Fecha inicio:</span>
                                <span className="ml-2 font-medium">
                                    {audit.scheduledAt ? new Date(audit.scheduledAt).toLocaleDateString('es-AR') : '-'}
                                </span>
                            </div>

                            <div>
                                <span className="text-gray-500">Estado actual:</span>
                                <span className="ml-2 font-medium">
                                    {audit.status}
                                </span>
                            </div>

                            <div className="col-span-2">
                                <span className="text-gray-500">Tiempo en estado:</span>
                                <span className="ml-2 font-medium">
                                    {audit.statusUpdatedAt 
                                        ? Math.floor((new Date() - new Date(audit.statusUpdatedAt)) / (1000 * 60 * 60)) + ' horas'
                                        : '-'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Campos Editables */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={form.nombre}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    CUIL *
                                </label>
                                <input
                                    type="text"
                                    name="cuil"
                                    value={form.cuil}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Teléfono *
                                </label>
                                <input
                                    type="text"
                                    name="telefono"
                                    value={form.telefono}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Obra Social Vendida *
                                </label>
                                <select
                                    name="obraSocialVendida"
                                    value={form.obraSocialVendida}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {OBRAS_VENDIDAS.map(os => (
                                        <option key={os} value={os}>{os}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Estado *
                                </label>
                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    required
                                >
                                    {STATUS_OPTIONS.map(st => {
                                        // ✅ Deshabilitar "Aprobada" y "Aprobada, pero no reconoce clave" si NO estuvo en "Cargada"
                                        const isAprobadaDisabled = (st === "Aprobada" || st === "Aprobada, pero no reconoce clave") && !wasInCargadaStatus;
                                        
                                        return (
                                            <option 
                                                key={st} 
                                                value={st}
                                                disabled={isAprobadaDisabled}
                                            >
                                                {st}
                                                {isAprobadaDisabled ? " (solo si estuvo en estado 'Cargada')" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                👤 Administrador (opcional)
                            </label>
                            <select
                                name="administrador"
                                value={form.administrador}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                <option value="">Sin asignar</option>
                                {administradores.map(admin => (
                                    <option key={admin._id} value={admin._id}>
                                        {admin.nombre || admin.name || admin.email}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Asigna un administrador responsable de generar el QR
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Datos Extra / Notas
                            </label>
                            <textarea
                                name="datosExtra"
                                value={form.datosExtra}
                                onChange={handleChange}
                                rows="3"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Información adicional..."
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting || loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={18} />
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </button>
                        
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || deleting}
                                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Guardando..." : "💾 Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
