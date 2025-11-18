// frontend/src/components/RH/EmpleadoEditModal.jsx

import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import apiClient from '../../services/api';
import { toast } from 'react-toastify';

export default function EmpleadoEditModal({ empleado, onClose, onSuccess }) {
    // Guardar la fecha de egreso original para mostrar la nota
    const fechaEgresoOriginal = empleado.fechaEgreso ? new Date(empleado.fechaEgreso).toLocaleDateString('es-AR') : null;
    
    const [form, setForm] = useState({
        nombreCompleto: empleado.nombreCompleto || '',
        telefonoPersonal: empleado.telefonoPersonal || '',
        fechaEntrevista: empleado.fechaEntrevista ? new Date(empleado.fechaEntrevista).toISOString().split('T')[0] : '',
        fechaIngreso: empleado.fechaIngreso ? new Date(empleado.fechaIngreso).toISOString().split('T')[0] : '',
        cargo: empleado.cargo || '',
        firmoContrato: empleado.firmoContrato || false,
        fotoDNI: empleado.fotoDNI || '',
        activo: empleado.activo !== undefined ? empleado.activo : true,
        fechaEgreso: empleado.fechaEgreso ? new Date(empleado.fechaEgreso).toISOString().split('T')[0] : '',
        motivoBaja: empleado.motivoBaja || '',
        notas: empleado.notas || ''
    });

    const [saving, setSaving] = useState(false);
    const [uploadingDNI, setUploadingDNI] = useState(false);
    const [showPreviousBajaNote, setShowPreviousBajaNote] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Si se desmarca "activo", auto-completar fecha de egreso
        if (name === 'activo' && !checked) {
            setForm(prev => ({
                ...prev,
                activo: false,
                fechaEgreso: new Date().toISOString().split('T')[0] // Fecha de hoy
            }));
        }
        // Si se marca "activo", limpiar fecha de egreso y motivo de baja, pero mostrar nota si tenía fecha previa
        else if (name === 'activo' && checked) {
            if (fechaEgresoOriginal) {
                setShowPreviousBajaNote(true);
            }
            setForm(prev => ({
                ...prev,
                activo: true,
                fechaEgreso: '',
                motivoBaja: ''
            }));
        }
        else {
            setForm(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.nombreCompleto.trim()) {
            toast.error('El nombre completo es requerido');
            return;
        }

        try {
            setSaving(true);
            await apiClient.put(`/employees/${empleado._id}`, form);
            toast.success('Empleado actualizado correctamente');
            onSuccess();
        } catch (error) {
            console.error('Error al actualizar empleado:', error);
            toast.error(error.response?.data?.message || 'Error al actualizar empleado');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-800">Editar Empleado</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Completo *
                            </label>
                            <input
                                type="text"
                                name="nombreCompleto"
                                value={form.nombreCompleto}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Teléfono Personal
                            </label>
                            <input
                                type="tel"
                                name="telefonoPersonal"
                                value={form.telefonoPersonal}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cargo
                            </label>
                            <input
                                type="text"
                                name="cargo"
                                value={form.cargo}
                                onChange={handleChange}
                                disabled
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha de Entrevista
                            </label>
                            <input
                                type="date"
                                name="fechaEntrevista"
                                value={form.fechaEntrevista}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Fecha de Ingreso
                            </label>
                            <input
                                type="date"
                                name="fechaIngreso"
                                value={form.fechaIngreso}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Foto DNI */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📸 Foto del DNI (.jpg, .png)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    
                                    try {
                                        setUploadingDNI(true);
                                        const formData = new FormData();
                                        formData.append('fotoDNI', file);
                                        
                                        const { data } = await apiClient.post('/employees/upload-dni', formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        
                                        setForm(prev => ({ ...prev, fotoDNI: data.fotoDNI }));
                                        toast.success('Foto de DNI cargada correctamente');
                                    } catch (error) {
                                        console.error('Error al subir foto:', error);
                                        toast.error(error.response?.data?.message || 'Error al subir foto de DNI');
                                    } finally {
                                        setUploadingDNI(false);
                                    }
                                }}
                                disabled={uploadingDNI}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            {uploadingDNI && (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                            )}
                        </div>
                        {form.fotoDNI && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <Upload size={12} /> Archivo cargado: {form.fotoDNI}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Seleccione una imagen del DNI (máximo 5MB)
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="firmoContrato"
                                checked={form.firmoContrato}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                ¿Firmó el contrato?
                            </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="activo"
                                checked={form.activo}
                                onChange={handleChange}
                                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                ¿Activo?
                            </span>
                        </label>
                    </div>

                    {/* Nota de baja previa */}
                    {form.activo && showPreviousBajaNote && fechaEgresoOriginal && (
                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r">
                            <p className="text-sm text-yellow-800">
                                ℹ️ Este usuario fue dado de baja previamente el <strong>{fechaEgresoOriginal}</strong>
                            </p>
                        </div>
                    )}

                    {!form.activo && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    📅 Fecha de Egreso
                                </label>
                                <input
                                    type="date"
                                    name="fechaEgreso"
                                    value={form.fechaEgreso}
                                    onChange={handleChange}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Se asigna automáticamente al desmarcar "Activo"
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Motivo de Baja
                                </label>
                                <select
                                    name="motivoBaja"
                                    value={form.motivoBaja}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="renuncia">Renuncia</option>
                                    <option value="despido">Despido</option>
                                    <option value="otros">Otros</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notas
                        </label>
                        <textarea
                            name="notas"
                            value={form.notas}
                            onChange={handleChange}
                            rows="3"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        ></textarea>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
