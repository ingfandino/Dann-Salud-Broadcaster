// frontend/src/pages/SalesForm.jsx

import React, { useEffect, useState } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';

const ARGENTINE_OBRAS_SOCIALES = [
    'OSDE', 'Medifé', 'OSDEPYM', 'IOMA', 'OSSEG', 'OSDE 210',
    'OSFATUN', 'OSDE GBA', 'OSECAC', 'OSPRERA', 'OMINT', 'OSSEGUR',
    'OSPR', 'OSUTHGRA', 'OSBLYCA', 'UOM', 'OSPM', 'OSPECON', 'Elevar', 'OSCHOCA',
    'OSPEP'
];

export default function SalesForm({ currentUser }) {
    const [form, setForm] = useState({
        nombre: '',
        cuil: '',
        telefono: '',
        tipoVenta: 'alta',
        obraSocialAnterior: '',
        obraSocialVendida: 'Binimed',
        fecha: '',
        hora: '',
        asesor: '',
        datosExtra: ''
    });
    const [asesores, setAsesores] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);

    // Rol de usuario
    const isSupervisor = currentUser?.role === 'Supervisor' || currentUser?.role === 'supervisor';

    useEffect(() => {
        // Cargar asesores del mismo grupo si es supervisor
        if (isSupervisor) fetchAsesores();
    }, [isSupervisor]);

    useEffect(() => {
        // Cuando fecha cambie, traer turnos disponibles
        if (form.fecha) fetchAvailableSlots(form.fecha);
    }, [form.fecha]);

    async function fetchAsesores() {
        try {
            const res = await apiClient.get('/users?scope=group');
            const list = Array.isArray(res.data) ? res.data : [];
            const onlyAsesores = list
                .filter(u => (u.role === 'asesor' || u.role === 'Asesor'))
                .filter(u => !!u.nombre && u.nombre.trim().length > 0)
                .sort((a,b) => a.nombre.localeCompare(b.nombre));
            setAsesores(onlyAsesores);
        } catch (err) {
            console.error(err);
            toast.error('No se pudieron cargar los asesores');
        }
    }

    async function fetchAvailableSlots(date) {
        setLoadingSlots(true);
        try {
            const res = await apiClient.get(`/audits/available-slots?date=${date}`);
            setAvailableSlots(res.data || []);
        } catch (err) {
            console.error(err);
            toast.error('No se pudieron cargar los turnos disponibles');
        } finally {
            setLoadingSlots(false);
        }
    }

    function validate(existingAudits = []) {
        if (!form.nombre.trim()) return 'Nombre de afiliado es requerido';

        if (existingAudits.some(a => a.nombre?.toLowerCase().trim() === form.nombre.toLowerCase().trim())) {
            return 'Ya existe un afiliado con ese nombre';
        }

        if (!form.cuil.trim()) return 'CUIL es requerido';
        if (!/^\d{11}$/.test(form.cuil)) return 'CUIL debe tener exactamente 11 dígitos';
        if (existingAudits.some(a => a.cuil?.trim() === form.cuil.trim())) {
            return 'Ya existe un afiliado con ese CUIL';
        }

        if (!/^\d{10}$/.test(form.telefono.replace(/\D/g, ''))) return 'Teléfono debe tener 10 dígitos';

        if (!form.obraSocialAnterior) return 'Obra social anterior es requerida';
        if (!form.obraSocialVendida) return 'Obra social vendida es requerida';
        if (!form.fecha || !form.hora) return 'Fecha y hora de auditoría son requeridas';
        if (isSupervisor && !form.asesor) return 'Debe seleccionar un asesor';
        if (form.fecha && form.hora) {
            const now = new Date();
            const selected = new Date(`${form.fecha}T${form.hora}:00`);
            if (selected < now) return "No se puede asignar un turno en el pasado";
        }
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        let existingAudits = [];
        try {
            const res = await apiClient.get("/audits", { params: { cuil: form.cuil } });
            existingAudits = res.data || [];
        } catch (err) {
            console.warn("No se pudo verificar duplicados", err);
        }

        const err = validate(existingAudits);
        if (err) { toast.error(err); return; }

        const payload = {
            nombre: form.nombre,
            cuil: form.cuil,
            telefono: form.telefono,
            tipoVenta: form.tipoVenta,
            obraSocialAnterior: form.obraSocialAnterior,
            obraSocialVendida: form.obraSocialVendida,
            scheduledAt: `${form.fecha}T${form.hora}:00`,
            asesor: isSupervisor ? form.asesor : currentUser._id,
            datosExtra: form.datosExtra?.trim() || ""
        };

        try {
            await apiClient.post('/audits', payload);
            toast.success('Auditoría pautada y notificada a los auditores');
            // limpiar form
            setForm({
                nombre: '',
                cuil: '',
                telefono: '',
                tipoVenta: 'alta',
                obraSocialAnterior: '',
                obraSocialVendida: 'Binimed',
                fecha: '',
                hora: '',
                asesor: '',
                datosExtra: ''
            });
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Error al enviar');
        }
    }

    // Generar lista de horas desde 09:20 hasta 21:00 en intervalos de 20 minutos
    function generateTimeOptions() {
        const options = [];
        const start = new Date();
        start.setHours(9, 20, 0, 0);
        const end = new Date();
        end.setHours(21, 0, 0, 0);
        let cur = new Date(start);
        while (cur <= end) {
            const hh = String(cur.getHours()).padStart(2, '0');
            const mm = String(cur.getMinutes()).padStart(2, '0');
            options.push(`${hh}:${mm}`);
            cur.setMinutes(cur.getMinutes() + 20);
        }
        return options;
    }

    // Filtrar opciones disponibles según availableSlots (capacidad 4)
    function getEnabledTimeOptions() {
        const all = generateTimeOptions();
        const map = {};
        (availableSlots || []).forEach(s => { map[s.time] = s.count; });
        return all.map(t => ({ time: t, disabled: (map[t] || 0) >= 4 }));
    }

    const timeOptions = getEnabledTimeOptions();

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h2 className="text-2xl font-semibold mb-4">Pautar auditoría / Venta</h2>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                    <div>
                        <label className="block text-sm">Nombre de afiliado</label>
                        <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm">CUIL</label>
                        <input value={form.cuil} onChange={e => setForm({ ...form, cuil: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm">Teléfono</label>
                        <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm">Tipo de venta</label>
                        <select value={form.tipoVenta} onChange={e => setForm({ ...form, tipoVenta: e.target.value })} className="w-full p-2 border rounded">
                            <option value="alta">Alta</option>
                            <option value="cambio">Cambio</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm">Obra social anterior</label>
                        <select value={form.obraSocialAnterior} onChange={e => setForm({ ...form, obraSocialAnterior: e.target.value })} className="w-full p-2 border rounded">
                            <option value="">-- Seleccionar --</option>
                            {ARGENTINE_OBRAS_SOCIALES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm">Obra social vendida</label>
                        <select value={form.obraSocialVendida} onChange={e => setForm({ ...form, obraSocialVendida: e.target.value })} className="w-full p-2 border rounded">
                            <option value="Binimed">Binimed</option>
                            <option value="Meplife">Meplife</option>
                            <option value="Medicenter">Medicenter</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm">Fecha (día)</label>
                        <input type="date" min={new Date().toISOString().split('T')[0]} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full p-2 border rounded" />
                    </div>

                    <div>
                        <label className="block text-sm">Hora (turno)</label>
                        <select value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className="w-full p-2 border rounded">
                            <option value="">-- Seleccionar --</option>
                            {loadingSlots ? <option>cargando...</option> : timeOptions.map(t => (
                                <option key={t.time} value={t.time} disabled={t.disabled}>{t.time}{t.disabled ? ' (completo)' : ''}</option>
                            ))}
                        </select>
                    </div>

                    {isSupervisor && (
                        <div>
                            <label className="block text-sm">Asesor (solo supervisores)</label>
                            <select value={form.asesor} onChange={e => setForm({ ...form, asesor: e.target.value })} className="w-full p-2 border rounded">
                                <option value="">-- Seleccionar asesor --</option>
                                {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm">Datos extra (opcional)</label>
                        <textarea
                            value={form.datosExtra}
                            onChange={e => setForm({ ...form, datosExtra: e.target.value })}
                            placeholder="Ejemplo: Afiliado con familiares, enfermedad preexistente, observaciones..."
                            className="w-full p-2 border rounded min-h-[70px]"
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Enviar</button>
                </div>
            </form>
        </div>
    );
}