// frontend/src/components/RH/EmpleadosFormulario.jsx

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Upload } from 'lucide-react';
import apiClient from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function EmpleadosFormulario({ onSuccess }) {
    const { user } = useAuth();
    const isSupervisor = user?.role?.toLowerCase() === 'supervisor';
    const [usuarios, setUsuarios] = useState([]);
    const [loadingUsuarios, setLoadingUsuarios] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingDNI, setUploadingDNI] = useState(false);

    const [form, setForm] = useState({
        userId: '',
        nombreCompleto: '',
        telefonoPersonal: '',
        fechaEntrevista: '',
        fechaIngreso: '',
        cargo: '',
        numeroEquipo: '',
        firmoContrato: false,
        fotoDNI: '',
        activo: true,
        notas: ''
    });

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            setLoadingUsuarios(true);
            
            // Obtener usuarios y empleados en paralelo
            const [usersResponse, employeesResponse] = await Promise.all([
                apiClient.get('/users'),
                apiClient.get('/employees')
            ]);
            
            const allUsers = usersResponse.data;
            const employees = employeesResponse.data;
            
            // Crear un Set con los IDs de usuarios que ya tienen registro de empleado
            const usersWithEmployee = new Set();
            employees.forEach(emp => {
                // Manejar diferentes estructuras de userId
                if (emp.userId) {
                    if (typeof emp.userId === 'string') {
                        usersWithEmployee.add(emp.userId);
                    } else if (emp.userId._id) {
                        usersWithEmployee.add(emp.userId._id);
                    }
                }
            });
            
            // Filtrar usuarios activos que NO tengan registro de empleado
            let filteredUsers = allUsers.filter(u => u.active && !usersWithEmployee.has(u._id));
            
            // Si es supervisor, solo mostrar usuarios de su equipo
            if (isSupervisor && user.numeroEquipo) {
                filteredUsers = filteredUsers.filter(u => u.numeroEquipo === user.numeroEquipo);
            }
            
            setUsuarios(filteredUsers);
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoadingUsuarios(false);
        }
    };

    const handleUserChange = (userId) => {
        setForm(prev => ({ ...prev, userId }));
        
        if (userId) {
            const user = usuarios.find(u => u._id === userId);
            if (user) {
                setForm(prev => ({
                    ...prev,
                    nombreCompleto: user.nombre || '',
                    cargo: user.role || '',
                    numeroEquipo: user.numeroEquipo || '',
                    fechaIngreso: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : ''
                }));
            }
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.userId) {
            toast.error('Debe seleccionar un usuario');
            return;
        }

        if (!form.nombreCompleto.trim()) {
            toast.error('El nombre completo es requerido');
            return;
        }

        try {
            setSaving(true);
            await apiClient.post('/employees', form);
            toast.success('Empleado creado correctamente');
            
            // Resetear formulario
            setForm({
                userId: '',
                nombreCompleto: '',
                telefonoPersonal: '',
                fechaEntrevista: '',
                fechaIngreso: '',
                cargo: '',
                numeroEquipo: '',
                firmoContrato: false,
                fotoDNI: '',
                activo: true,
                notas: ''
            });

            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error al crear empleado:', error);
            toast.error(error.response?.data?.message || 'Error al crear empleado');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Nuevo Empleado</h2>
                <p className="text-gray-600">
                    Complete los datos del nuevo empleado asociándolo a una cuenta de usuario existente
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selección de usuario */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Usuario de la Plataforma *
                    </label>
                    <select
                        value={form.userId}
                        onChange={(e) => handleUserChange(e.target.value)}
                        required
                        disabled={loadingUsuarios}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Seleccionar usuario...</option>
                        {usuarios.map(user => (
                            <option key={user._id} value={user._id}>
                                {user.nombre} - {user.email} ({user.role})
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Seleccione la cuenta de usuario que quedará asociada a este empleado
                    </p>
                </div>

                {/* Datos personales */}
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
                            placeholder="Ej: 1112345678"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número de Equipo
                        </label>
                        <input
                            type="text"
                            name="numeroEquipo"
                            value={form.numeroEquipo}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <p className="text-xs text-gray-500 mt-1">
                            Por defecto se asigna la fecha de creación de la cuenta
                        </p>
                    </div>
                </div>

                {/* Cargo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cargo (Rol)
                    </label>
                    <input
                        type="text"
                        name="cargo"
                        value={form.cargo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        El cargo se obtiene automáticamente del rol del usuario
                    </p>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
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

                {/* Foto DNI */}
                <div>
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

                {/* Notas */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas
                    </label>
                    <textarea
                        name="notas"
                        value={form.notas}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Observaciones adicionales..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    ></textarea>
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => {
                            setForm({
                                userId: '',
                                nombreCompleto: '',
                                telefonoPersonal: '',
                                fechaEntrevista: '',
                                fechaIngreso: '',
                                cargo: '',
                                numeroEquipo: '',
                                firmoContrato: false,
                                fotoDNI: '',
                                activo: true,
                                notas: ''
                            });
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw size={18} />
                        Limpiar Formulario
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !form.userId}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {saving ? 'Guardando...' : 'Crear Empleado'}
                    </button>
                </div>
            </form>
        </div>
    );
}
