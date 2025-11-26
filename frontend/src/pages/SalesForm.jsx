// frontend/src/pages/SalesForm.jsx

import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';

const ARGENTINE_OBRAS_SOCIALES = [
    "OSDE",
    "OSDEPYM",
    "IOMA",
    "OSSEG",
    "OSDE 210",
    "OSFATUN",
    "OSDE GBA",
    "OSECAC (126205)",
    "OSPRERA",
    "OMINT",
    "OSSEGUR",
    "OSPR",
    "OSUTHGRA (108803)",
    "OSBLYCA",
    "UOM",
    "OSPM",
    "OSPECON (105408)",
    "Elevar (114307)",
    "OSCHOCA (105804)",
    "OSPEP (113908)",
    "OSPROTURA",
    "OSPSIP (119708)",
    "OSEIV (122401)",
    "OSPIF (108100)",
    "OSIPA (114208)",
    "OSPESESGYPE (107206)",
    "OSTCARA (126007)",
    "OSPIT (121002)",
    "OSMP (111209)",
    "OSPECA (103709)",
    "OSPIQYP (118705)",
    "OSBLYCA (102904)",
    "VIASANO (2501)",
    "OSPCYD (103402)",
    "OSUOMRA (112103)",
    "OSAMOC (3405)",
    "OSPAGA (101000)",
    "OSPF (107404)",
    "OSPIP (116006)",
    "OSPIC",
    "OSG (109202)"
];

export default function SalesForm({ currentUser }) {
    // 🔍 DEBUG: Log completo del currentUser al inicio
    console.log('='.repeat(80));
    console.log('🔍 SalesForm - DEBUG COMPLETO currentUser:');
    console.log('currentUser completo:', currentUser);
    console.log('currentUser._id:', currentUser?._id);
    console.log('currentUser.nombre:', currentUser?.nombre);
    console.log('currentUser.email:', currentUser?.email);
    console.log('currentUser.role:', currentUser?.role);
    console.log('currentUser.numeroEquipo:', currentUser?.numeroEquipo);
    console.log('currentUser.numeroEquipo TYPE:', typeof currentUser?.numeroEquipo);
    console.log('currentUser.numeroEquipo IS NULL:', currentUser?.numeroEquipo === null);
    console.log('currentUser.numeroEquipo IS UNDEFINED:', currentUser?.numeroEquipo === undefined);
    console.log('='.repeat(80));

    const [form, setForm] = useState({
        nombre: '',
        cuil: '',
        telefono: '',
        tipoVenta: 'alta',
        obraSocialAnterior: '',
        obraSocialVendida: 'Binimed',
        fecha: '',
        hora: '',
        supervisor: '', // ✅ Nuevo campo para Gerencia/Auditor
        asesor: '',
        validador: '', // ✅ Usuario que valida la venta
        datosExtra: ''
    });
    const [asesores, setAsesores] = useState([]);
    const [supervisores, setSupervisores] = useState([]); // ✅ Lista de supervisores
    const [validadores, setValidadores] = useState([]); // ✅ Lista de validadores (mismo equipo)
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [otroEquipo, setOtroEquipo] = useState(false); // ✅ Checkbox para mostrar validadores de todos los equipos

    // ✅ Estados para carga masiva
    const [uploadingBulk, setUploadingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
    const [rejectedRows, setRejectedRows] = useState([]);
    const fileInputRef = useRef(null);

    // Rol de usuario
    const isSupervisor = currentUser?.role === 'Supervisor' || currentUser?.role === 'supervisor';
    const isGerenciaOrAuditor = currentUser?.role === 'Gerencia' || currentUser?.role === 'gerencia' ||
        currentUser?.role === 'Auditor' || currentUser?.role === 'auditor'; // ✅

    useEffect(() => {
        // Cargar todos los usuarios del mismo grupo/equipo si es supervisor
        if (isSupervisor) fetchAsesores();
        // ✅ Cargar supervisores si es Gerencia o Auditor
        if (isGerenciaOrAuditor) fetchSupervisores();
        // ✅ Cargar validadores (compañeros del mismo equipo) - solo para roles no-gerencia
        if (!isGerenciaOrAuditor) fetchValidadores();
    }, [isSupervisor, isGerenciaOrAuditor]);

    // ✅ Cuando cambie el supervisor seleccionado, cargar asesores y validadores de su equipo
    useEffect(() => {
        if (isGerenciaOrAuditor && form.supervisor) {
            const supervisorSeleccionado = supervisores.find(s => s._id === form.supervisor);
            if (supervisorSeleccionado?.numeroEquipo) {
                fetchAsesoresByEquipo(supervisorSeleccionado.numeroEquipo);
                fetchValidadoresByEquipo(supervisorSeleccionado.numeroEquipo); // ✅ También validadores
            }
        }
    }, [form.supervisor, isGerenciaOrAuditor]);

    // ✅ Cuando cambie el asesor seleccionado o el checkbox de otroEquipo, actualizar validadores
    useEffect(() => {
        if (otroEquipo) {
            // Mostrar todos los usuarios de la plataforma
            fetchTodosLosValidadores();
        } else if (isSupervisor) {
            // Para supervisores, recargar validadores del mismo equipo
            fetchValidadores();
        } else if (isGerenciaOrAuditor && form.supervisor) {
            // Para gerencia/auditor, recargar validadores del equipo del supervisor seleccionado
            const supervisorSeleccionado = supervisores.find(s => s._id === form.supervisor);
            if (supervisorSeleccionado?.numeroEquipo) {
                fetchValidadoresByEquipo(supervisorSeleccionado.numeroEquipo);
            }
        } else if (!isGerenciaOrAuditor && !isSupervisor) {
            // Para otros roles (asesor), cargar validadores del mismo equipo
            fetchValidadores();
        }
    }, [form.asesor, otroEquipo, isGerenciaOrAuditor, isSupervisor, form.supervisor]);

    useEffect(() => {
        // Cuando fecha cambie, traer turnos disponibles
        if (form.fecha) fetchAvailableSlots(form.fecha);
    }, [form.fecha]);

    // Cargar todos los supervisores (para Gerencia/Auditor)
    async function fetchSupervisores() {
        try {
            const res = await apiClient.get('/users');
            const list = Array.isArray(res.data) ? res.data : [];
            const supervisorList = list
                .filter(u => {
                    const isActive = u?.active !== false;
                    return isActive && (u.role === 'supervisor' || u.role === 'Supervisor') && u.nombre && u.nombre.trim().length > 0;
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
            setSupervisores(supervisorList);
        } catch (err) {
            console.error(err);
            toast.error('No se pudieron cargar los supervisores');
        }
    }

    // ✅ Cargar asesores del equipo del supervisor (filtrando por roles)
    async function fetchAsesores() {
        try {
            // ✅ CRÍTICO: scope=group para que backend filtre por numeroEquipo
            const res = await apiClient.get('/users?scope=group');
            const list = Array.isArray(res.data) ? res.data : [];

            console.log('🔍 fetchAsesores - currentUser.numeroEquipo:', currentUser.numeroEquipo);
            console.log('🔍 fetchAsesores - Total usuarios:', list.length);

            const myNumeroEquipo = currentUser.numeroEquipo ? String(currentUser.numeroEquipo) : null;

            if (!myNumeroEquipo) {
                console.warn('⚠️ Supervisor sin numeroEquipo asignado');
                setAsesores([]);
                return;
            }

            const filtered = list
                .filter(u => {
                    const isActive = u?.active !== false;
                    const usuarioNumeroEquipo = u.numeroEquipo ? String(u.numeroEquipo) : null;
                    const esRolCorrecto = u.role === 'asesor' || u.role === 'Asesor' ||
                        u.role === 'auditor' || u.role === 'Auditor' ||
                        u.role === 'supervisor' || u.role === 'Supervisor';
                    const mismoEquipo = usuarioNumeroEquipo === myNumeroEquipo;
                    const tieneNombre = u.nombre && u.nombre.trim().length > 0;

                    return isActive && esRolCorrecto && mismoEquipo && tieneNombre;
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log('✅ fetchAsesores - Asesores encontrados:', filtered.length, filtered.map(a => a.nombre));
            setAsesores(filtered);
        } catch (err) {
            console.error('❌ Error al cargar asesores', err);
        }
    }

    // Cargar asesores y auditores de un equipo específico (para Gerencia/Auditor)
    async function fetchAsesoresByEquipo(numeroEquipo) {
        try {
            const res = await apiClient.get('/users');
            const list = Array.isArray(res.data) ? res.data : [];

            console.log('🔍 fetchAsesoresByEquipo - numeroEquipo:', numeroEquipo);

            const equipoBuscado = numeroEquipo ? String(numeroEquipo) : null;

            if (!equipoBuscado) {
                console.warn('⚠️ numeroEquipo no válido');
                setAsesores([]);
                return;
            }

            const filtered = list
                .filter(u => {
                    const isActive = u?.active !== false;
                    const usuarioNumeroEquipo = u.numeroEquipo ? String(u.numeroEquipo) : null;
                    const esRolCorrecto = u.role === 'asesor' || u.role === 'Asesor' ||
                        u.role === 'auditor' || u.role === 'Auditor' ||
                        u.role === 'supervisor' || u.role === 'Supervisor';
                    const mismoEquipo = usuarioNumeroEquipo === equipoBuscado;
                    const tieneNombre = u.nombre && u.nombre.trim().length > 0;

                    return isActive && esRolCorrecto && mismoEquipo && tieneNombre;
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log('✅ fetchAsesoresByEquipo - Asesores encontrados:', filtered.length, filtered.map(a => a.nombre));
            setAsesores(filtered);
        } catch (err) {
            console.error('❌ Error al cargar asesores del equipo', err);
            toast.error('No se pudieron cargar los asesores del equipo');
        }
    }

    // ✅ Cargar validadores: usuarios del mismo numeroEquipo, excluyendo al usuario actual (excepto si es supervisor) y al asesor seleccionado
    async function fetchValidadores() {
        try {
            // ✅ CRÍTICO: scope=group para que backend filtre por numeroEquipo
            const res = await apiClient.get('/users?scope=group');
            const list = Array.isArray(res.data) ? res.data : [];

            console.log('🔍 fetchValidadores - currentUser.numeroEquipo:', currentUser.numeroEquipo);
            console.log('🔍 fetchValidadores - asesor seleccionado:', form.asesor);

            const myNumeroEquipo = currentUser.numeroEquipo ? String(currentUser.numeroEquipo) : null;

            if (!myNumeroEquipo) {
                console.warn('⚠️ Usuario sin numeroEquipo asignado');
                setValidadores([]);
                return;
            }

            const filtered = list
                .filter(u => {
                    const isActive = u?.active !== false;
                    const usuarioNumeroEquipo = u.numeroEquipo ? String(u.numeroEquipo) : null;

                    if (!isActive) return false;
                    // Mismo numeroEquipo
                    if (usuarioNumeroEquipo !== myNumeroEquipo) return false;
                    // Debe tener nombre
                    if (!u.nombre || u.nombre.trim().length === 0) return false;
                    // Excluir al asesor seleccionado
                    if (form.asesor && u._id === form.asesor) return false;
                    // Si es supervisor, puede auto-seleccionarse
                    if (isSupervisor) return true;
                    // Si no es supervisor, excluir al usuario actual
                    return u._id !== currentUser._id;
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log('✅ fetchValidadores - Validadores encontrados:', filtered.length, filtered.map(v => v.nombre));
            setValidadores(filtered);
        } catch (err) {
            console.error('❌ Error al cargar validadores', err);
        }
    }

    async function fetchTodosLosValidadores() {
        try {
            // ✅ includeAllAuditors=true para que supervisores puedan ver TODOS los usuarios
            const res = await apiClient.get('/users?includeAllAuditors=true');
            const list = Array.isArray(res.data) ? res.data : [];

            console.log('🔍 fetchTodosLosValidadores - Total usuarios:', list.length);

            const filtered = list
                .filter(u => {
                    const isActive = u?.active !== false;
                    const role = u.role?.toLowerCase();

                    if (!isActive) return false;
                    // Debe tener nombre
                    if (!u.nombre || u.nombre.trim().length === 0) return false;
                    // Filtrar por roles permitidos: asesor, supervisor, auditor, gerencia
                    if (!['asesor', 'supervisor', 'auditor', 'gerencia'].includes(role)) return false;
                    // Excluir al asesor seleccionado
                    if (form.asesor && u._id === form.asesor) return false;
                    // Mostrar todos los demás
                    return true;
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log('✅ fetchTodosLosValidadores - Validadores encontrados:', filtered.length);
            setValidadores(filtered);
        } catch (err) {
            console.error('❌ Error al cargar todos los validadores', err);
            toast.error('No se pudieron cargar los validadores');
        }
    }

    // ✅ Cargar validadores de un equipo específico (para Gerencia/Auditor), excluyendo al asesor seleccionado
    async function fetchValidadoresByEquipo(numeroEquipo) {
        try {
            const res = await apiClient.get('/users');
            const list = Array.isArray(res.data) ? res.data : [];

            console.log('🔍 fetchValidadoresByEquipo - numeroEquipo:', numeroEquipo);
            console.log('🔍 fetchValidadoresByEquipo - asesor seleccionado:', form.asesor);

            const equipoBuscado = numeroEquipo ? String(numeroEquipo) : null;

            if (!equipoBuscado) {
                console.warn('⚠️ numeroEquipo no válido');
                setValidadores([]);
                return;
            }

            const filtered = list
                .filter(u => {
                    const isActive = u?.active !== false;
                    const usuarioNumeroEquipo = u.numeroEquipo ? String(u.numeroEquipo) : null;

                    if (!isActive) return false;
                    // Mismo numeroEquipo del supervisor seleccionado
                    if (usuarioNumeroEquipo !== equipoBuscado) return false;
                    // Debe tener nombre
                    if (!u.nombre || u.nombre.trim().length === 0) return false;
                    // Excluir al asesor seleccionado
                    if (form.asesor && u._id === form.asesor) return false;
                    // Gerencia/Auditor pueden ver todos los demás del equipo
                    return true;
                })
                .sort((a, b) => a.nombre.localeCompare(b.nombre));

            console.log('✅ fetchValidadoresByEquipo - Validadores encontrados:', filtered.length, filtered.map(v => v.nombre));
            setValidadores(filtered);
        } catch (err) {
            console.error('❌ Error al cargar validadores del equipo', err);
            toast.error('No se pudieron cargar los validadores del equipo');
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

        // CUIL es obligatorio
        if (!form.cuil.trim()) return 'CUIL es requerido';

        if (!/^\d{11}$/.test(form.cuil)) return 'CUIL debe tener exactamente 11 dígitos';

        // VALIDACIÓN MEJORADA: Solo bloquear cuando CUIL Y teléfono coincidan juntos
        // Normalizar teléfono para comparación (solo dígitos)
        const telefonoNormalizado = form.telefono.replace(/\D/g, '');

        const duplicateConflict = existingAudits.find(a => {
            const cuilMatch = a.cuil?.trim() === form.cuil.trim();
            const telefonoMatch = a.telefono?.replace(/\D/g, '') === telefonoNormalizado;
            return cuilMatch && telefonoMatch; // Ambos deben coincidir
        });

        if (duplicateConflict && duplicateConflict.status !== 'Rechazada') {
            return `El afiliado ya ha sido previamente cargado (CUIL y teléfono coinciden). Solo puede reutilizarse si la auditoría anterior fue rechazada.`;
        }

        if (!/^\d{10}$/.test(form.telefono.replace(/\D/g, ''))) return 'Teléfono debe tener 10 dígitos';

        if (!form.obraSocialAnterior) return 'Obra social anterior es requerida';
        if (!form.obraSocialVendida) return 'Obra social vendida es requerida';
        if (!form.fecha || !form.hora) return 'Fecha y hora de auditoría son requeridas';
        if (isSupervisor && !form.asesor) return 'Debe seleccionar un asesor';
        // Validación para Gerencia/Auditor
        if (isGerenciaOrAuditor && !form.supervisor) return 'Debe seleccionar un supervisor';
        if (isGerenciaOrAuditor && !form.asesor) return 'Debe seleccionar un asesor';
        // Validador es obligatorio
        if (!form.validador) return 'Debe seleccionar un validador';

        // ✅ CORRECCIÓN: Se eliminó la restricción de horario de 20 minutos
        // Ahora se permite crear turnos en cualquier hora, incluso después de las 21 hrs
        return null;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        let existingAudits = [];
        try {
            // Buscar auditorías que coincidan en CUIL o teléfono para validación precisa
            const telefonoNormalizado = form.telefono.replace(/\D/g, '');
            const res = await apiClient.get("/audits", {
                params: {
                    cuil: form.cuil,
                    telefono: telefonoNormalizado
                }
            });
            existingAudits = res.data || [];
        } catch (err) {
            console.warn("No se pudo verificar duplicados", err);
        }

        const err = validate(existingAudits);
        if (err) { toast.error(err); return; }

        // Determinar asesor según rol
        let asesorId;
        if (isGerenciaOrAuditor) {
            asesorId = form.asesor; // Gerencia/Auditor seleccionan manualmente
        } else if (isSupervisor) {
            asesorId = form.asesor; // Supervisor selecciona de su equipo
        } else {
            asesorId = currentUser._id; // Asesor normal se asigna a sí mismo
        }

        const payload = {
            nombre: form.nombre,
            cuil: form.cuil,
            telefono: form.telefono,
            tipoVenta: form.tipoVenta,
            obraSocialAnterior: form.obraSocialAnterior,
            obraSocialVendida: form.obraSocialVendida,
            scheduledAt: `${form.fecha}T${form.hora}:00`,
            asesor: asesorId,
            validador: form.validador, // Usuario que valida la venta
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
                supervisor: '',
                asesor: '',
                validador: '',
                datosExtra: ''
            });
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || 'Error al enviar');
        }
    }

    // ✅ Calcular fecha mínima: si son las 23:01 o después, devuelve mañana; sino hoy
    // ✅ PRIVILEGIO ESPECIAL: Gerencia puede seleccionar cualquier fecha del pasado
    function getMinDate() {
        const isGerencia = currentUser?.role?.toLowerCase() === 'gerencia';

        // Gerencia puede crear ventas de cualquier fecha (sin restricción)
        if (isGerencia) {
            return '2020-01-01'; // Fecha mínima muy antigua
        }

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // Si es después de las 23:00 (23:01 o posterior), la fecha mínima es mañana
        if (hours === 23 && minutes >= 1) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        } else if (hours > 23) {
            // Después de medianoche
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        }

        // Antes de las 23:01, la fecha mínima es hoy
        return now.toISOString().split('T')[0];
    }

    // Generar lista de horas desde 09:20 hasta 23:00 en intervalos de 20 minutos
    function generateTimeOptions() {
        const options = [];
        const start = new Date();
        start.setHours(9, 20, 0, 0);
        const end = new Date();
        end.setHours(23, 0, 0, 0); // ✅ Extendido hasta las 23:00
        let cur = new Date(start);
        while (cur <= end) {
            const hh = String(cur.getHours()).padStart(2, '0');
            const mm = String(cur.getMinutes()).padStart(2, '0');
            options.push(`${hh}:${mm}`);
            cur.setMinutes(cur.getMinutes() + 20);
        }
        return options;
    }

    // Filtrar opciones disponibles según availableSlots (capacidad 10)
    function getEnabledTimeOptions() {
        const all = generateTimeOptions();
        const map = {};
        (availableSlots || []).forEach(s => { map[s.time] = s.count; });
        // Límite: 10 auditorías por turno (se bloquea al llegar a 10)
        return all.map(t => ({ time: t, disabled: (map[t] || 0) >= 10 }));
    }

    const timeOptions = getEnabledTimeOptions();

    // ✅ Procesar archivo de carga masiva
    async function handleBulkUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingBulk(true);
        setRejectedRows([]);
        setBulkProgress({ current: 0, total: 0 });

        try {
            const data = await readExcelFile(file);
            if (!data || data.length === 0) {
                toast.error('El archivo está vacío o no tiene el formato correcto');
                return;
            }

            // ✅ Obtener todos los usuarios para resolver nombres a IDs
            const usersRes = await apiClient.get('/users?includeAllAuditors=true');
            const allUsers = usersRes.data || [];

            // Obtener todas las auditorías existentes para validación
            const existingAuditsRes = await apiClient.get('/audits');
            const existingAudits = existingAuditsRes.data || [];

            const rejected = [];
            const toCreate = [];

            setBulkProgress({ current: 0, total: data.length });

            // Validar cada fila
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNumber = i + 2; // +2 porque Excel empieza en 1 y tiene header

                // Validar campos requeridos
                if (!row.nombre?.trim()) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Nombre de afiliado es requerido' });
                    continue;
                }

                if (!row.cuil?.trim() || !/^\d{11}$/.test(row.cuil.trim())) {
                    rejected.push({ row: rowNumber, data: row, reason: 'CUIL debe tener exactamente 11 dígitos' });
                    continue;
                }

                const telefonoNormalizado = row.telefono?.replace(/\D/g, '') || '';
                if (!/^\d{10}$/.test(telefonoNormalizado)) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Teléfono debe tener 10 dígitos' });
                    continue;
                }

                // ✅ Validar duplicados (CUIL + teléfono)
                const duplicateConflict = existingAudits.find(a => {
                    const cuilMatch = a.cuil?.trim() === row.cuil.trim();
                    const telefonoMatch = a.telefono?.replace(/\D/g, '') === telefonoNormalizado;
                    return cuilMatch && telefonoMatch;
                });

                if (duplicateConflict && duplicateConflict.status !== 'Rechazada') {
                    rejected.push({
                        row: rowNumber,
                        data: row,
                        reason: 'CUIL y teléfono ya registrados en el sistema'
                    });
                    continue;
                }

                if (!row.obraSocialAnterior) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Obra social anterior es requerida' });
                    continue;
                }

                if (!row.obraSocialVendida) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Obra social vendida es requerida' });
                    continue;
                }

                if (!row.fecha) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Fecha es requerida' });
                    continue;
                }

                if (!row.asesor) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Asesor es requerido' });
                    continue;
                }

                if (!row.validador) {
                    rejected.push({ row: rowNumber, data: row, reason: 'Validador es requerido' });
                    continue;
                }

                // ✅ Resolver nombres de usuario a IDs
                const asesorUser = allUsers.find(u =>
                    u.nombre?.toLowerCase().trim() === row.asesor?.toLowerCase().trim() ||
                    u._id === row.asesor
                );

                if (!asesorUser) {
                    rejected.push({
                        row: rowNumber,
                        data: row,
                        reason: `Asesor "${row.asesor}" no encontrado en el sistema`
                    });
                    continue;
                }

                const validadorUser = allUsers.find(u =>
                    u.nombre?.toLowerCase().trim() === row.validador?.toLowerCase().trim() ||
                    u._id === row.validador
                );

                if (!validadorUser) {
                    rejected.push({
                        row: rowNumber,
                        data: row,
                        reason: `Validador "${row.validador}" no encontrado en el sistema`
                    });
                    continue;
                }

                // Supervisor es opcional
                let supervisorId = null;
                if (row.supervisor) {
                    const supervisorUser = allUsers.find(u =>
                        u.nombre?.toLowerCase().trim() === row.supervisor?.toLowerCase().trim() ||
                        u._id === row.supervisor
                    );

                    if (!supervisorUser) {
                        rejected.push({
                            row: rowNumber,
                            data: row,
                            reason: `Supervisor "${row.supervisor}" no encontrado en el sistema`
                        });
                        continue;
                    }
                    supervisorId = supervisorUser._id;
                }

                // Auditor es opcional
                let auditorId = null;
                if (row.auditor) {
                    const auditorUser = allUsers.find(u =>
                        u.nombre?.toLowerCase().trim() === row.auditor?.toLowerCase().trim() ||
                        u._id === row.auditor
                    );

                    if (!auditorUser) {
                        // No se rechaza si el auditor no se encuentra, simplemente no se asigna
                        console.warn(`Auditor "${row.auditor}" no encontrado para la fila ${rowNumber}. Se ignorará.`);
                    } else {
                        auditorId = auditorUser._id;
                    }
                }

                // Validación exitosa, agregar a la lista de creación con IDs resueltos
                toCreate.push({
                    ...row,
                    telefonoNormalizado,
                    asesorId: asesorUser._id,
                    validadorId: validadorUser._id,
                    supervisorId,
                    auditorId,
                    estado: row.estado || '' // Opcional
                });
            }

            setRejectedRows(rejected);

            // Crear auditorías válidas
            let successCount = 0;
            if (toCreate.length > 0) {
                successCount = await createBulkAudits(toCreate, rejected);
            }

            // Generar reporte final consolidado
            if (rejected.length > 0) {
                const message = successCount > 0
                    ? `${successCount} ventas creadas exitosamente, ${rejected.length} rechazadas.`
                    : `Todas las filas fueron rechazadas (${rejected.length} rechazos).`;
                toast.warning(message);
                generateRejectionReport(rejected);
            } else {
                toast.success(`¡${successCount} ventas creadas exitosamente!`);
            }

        } catch (err) {
            console.error('Error procesando archivo:', err);
            toast.error('Error al procesar el archivo: ' + (err.message || 'Error desconocido'));
        } finally {
            setUploadingBulk(false);
            setBulkProgress({ current: 0, total: 0 });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    // Leer archivo Excel/CSV
    async function readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                    // Función para normalizar fechas de Excel
                    const normalizeFecha = (value) => {
                        if (!value) return '';

                        // Si es un número (serial de Excel)
                        if (typeof value === 'number') {
                            // Excel almacena fechas como días desde 30/12/1899
                            const excelEpoch = new Date(1899, 11, 30);
                            const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);

                            if (!isNaN(date.getTime())) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            }
                        }

                        // Si es un string, intentar parsearlo
                        if (typeof value === 'string') {
                            // Si ya está en formato YYYY-MM-DD
                            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                                return value;
                            }

                            // Intentar parsear DD/MM/YYYY o D/M/YYYY
                            const parts = value.split('/');
                            if (parts.length === 3) {
                                const day = parseInt(parts[0], 10);
                                const month = parseInt(parts[1], 10);
                                const year = parseInt(parts[2], 10);

                                if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                                    const date = new Date(year, month - 1, day);
                                    if (!isNaN(date.getTime())) {
                                        const year = date.getFullYear();
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const day = String(date.getDate()).padStart(2, '0');
                                        return `${year}-${month}-${day}`;
                                    }
                                }
                            }

                            // Intentar parsear como fecha genérica
                            const date = new Date(value);
                            if (!isNaN(date.getTime())) {
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                            }
                        }

                        return '';
                    };

                    // Normalizar nombre de obra social (BINIMED -> Binimed, MEPLIFE -> Meplife)
                    const normalizarObraSocial = (value) => {
                        if (!value) return 'Binimed';
                        const str = String(value).trim().toUpperCase();

                        if (str === 'BINIMED') return 'Binimed';
                        if (str === 'MEPLIFE') return 'Meplife';

                        // Si no coincide, capitalizar primera letra
                        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
                    };

                    // Normalizar nombres de columnas
                    const normalized = jsonData.map(row => ({
                        nombre: row['Nombre de afiliado'] || row['Nombre'] || row['nombre'] || '',
                        cuil: String(row['CUIL'] || row['cuil'] || '').trim(),
                        telefono: String(row['Teléfono'] || row['Telefono'] || row['telefono'] || '').trim(),
                        tipoVenta: (row['Tipo de venta'] || row['Tipo'] || row['tipo'] || 'alta').toLowerCase(),
                        obraSocialAnterior: row['Obra social anterior'] || row['OS Anterior'] || row['obraSocialAnterior'] || '',
                        obraSocialVendida: normalizarObraSocial(row['Obra social vendida'] || row['OS Vendida'] || row['obraSocialVendida']),
                        fecha: normalizeFecha(row['Fecha'] || row['fecha']),
                        supervisor: row['Supervisor'] || row['supervisor'] || '',
                        asesor: row['Asesor'] || row['asesor'] || '',
                        validador: row['Validador'] || row['validador'] || '',
                        auditor: row['Auditor'] || row['auditor'] || '', // Opcional
                        estado: row['Estado'] || row['estado'] || '', // Opcional
                        datosExtra: row['Datos extra'] || row['datosExtra'] || ''
                    }));

                    resolve(normalized);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            reader.readAsArrayBuffer(file);
        });
    }

    // Crear auditorías en lote
    async function createBulkAudits(rows, rejectedArray) {
        let successCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            setBulkProgress({ current: i + 1, total: rows.length });

            try {
                // Validar que la fecha sea válida antes de consultar turnos
                if (!row.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(row.fecha)) {
                    const rejection = {
                        row: i + 2,
                        data: row,
                        reason: `Fecha inválida: "${row.fecha}". Debe estar en formato YYYY-MM-DD`
                    };
                    rejectedArray.push(rejection);
                    setRejectedRows(prev => [...prev, rejection]);
                    continue;
                }

                console.log(`🔍 [DEBUG] Procesando fila ${i + 2}, fecha: "${row.fecha}"`);

                // Obtener turnos disponibles para la fecha
                const slotsRes = await apiClient.get(`/audits/available-slots?date=${row.fecha}`);
                const slots = slotsRes.data || [];

                // Buscar primer turno disponible (con menos de 10 auditorías)
                const availableSlot = slots.find(s => s.count < 10);

                if (!availableSlot) {
                    const rejection = {
                        row: i + 2,
                        data: row,
                        reason: 'No hay turnos disponibles para la fecha especificada'
                    };
                    rejectedArray.push(rejection);
                    setRejectedRows(prev => [...prev, rejection]);
                    continue;
                }

                const payload = {
                    nombre: row.nombre,
                    cuil: row.cuil,
                    telefono: row.telefonoNormalizado,
                    tipoVenta: row.tipoVenta,
                    obraSocialAnterior: row.obraSocialAnterior,
                    obraSocialVendida: row.obraSocialVendida,
                    scheduledAt: `${row.fecha}T${availableSlot.time}:00`,
                    asesor: row.asesorId,
                    validador: row.validadorId,
                    datosExtra: row.datosExtra?.trim() || ''
                };

                // Añadir campos opcionales si existen
                if (row.auditorId) {
                    payload.auditor = row.auditorId;
                }
                if (row.estado) {
                    payload.estado = row.estado;
                }

                await apiClient.post('/audits', payload);
                successCount++;

                // Pequeña pausa para no saturar el servidor
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (err) {
                console.error('Error creando auditoría:', err);
                const rejection = {
                    row: i + 2,
                    data: row,
                    reason: err.response?.data?.message || err.message || 'Error al crear la auditoría'
                };
                rejectedArray.push(rejection);
                setRejectedRows(prev => [...prev, rejection]);
            }
        }

        return successCount;
    }

    // Generar reporte de rechazos en Excel
    function generateRejectionReport(rejected) {
        const reportData = rejected.map(r => ({
            'Fila': r.row,
            'Nombre': r.data.nombre,
            'CUIL': r.data.cuil,
            'Teléfono': r.data.telefono,
            'Motivo de Rechazo': r.reason
        }));

        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rechazados');

        const fileName = `ventas_rechazadas_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        toast.info(`Reporte de rechazos descargado: ${fileName}`);
    }

    return (
        <div className="max-w-3xl mx-auto p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Pautar auditoría / Venta</h2>

                {/* ✅ Botón de carga masiva */}
                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleBulkUpload}
                        className="hidden"
                        disabled={uploadingBulk}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingBulk}
                        className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {uploadingBulk ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando... {bulkProgress.current}/{bulkProgress.total}
                            </>
                        ) : (
                            <>
                                📤 Carga Masiva
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ✅ Mostrar rechazos si existen */}
            {rejectedRows.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">
                        ⚠️ {rejectedRows.length} filas rechazadas
                    </p>
                    <p className="text-xs text-yellow-700">
                        Se ha descargado un reporte con los detalles de las filas rechazadas.
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                    <div>
                        <label className="block text-sm">Nombre de afiliado</label>
                        <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm">CUIL <span className="text-red-500">*</span></label>
                        <input
                            value={form.cuil}
                            onChange={e => setForm({ ...form, cuil: e.target.value })}
                            className="w-full p-2 border rounded"
                            placeholder="11 dígitos"
                            required
                        />
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
                            <option value="TURF">TURF</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm">Fecha (día)</label>
                        <input type="date" min={getMinDate()} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full p-2 border rounded" />
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

                    {/* ✅ Campos para Gerencia y Auditor */}
                    {isGerenciaOrAuditor && (
                        <>
                            <div>
                                <label className="block text-sm">Supervisor <span className="text-red-500">*</span></label>
                                <select
                                    value={form.supervisor}
                                    onChange={e => setForm({ ...form, supervisor: e.target.value, asesor: '' })}
                                    className="w-full p-2 border rounded"
                                    required
                                >
                                    <option value="">-- Seleccionar supervisor --</option>
                                    {supervisores.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.nombre} (Equipo: {s.numeroEquipo || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm">Asesor <span className="text-red-500">*</span></label>
                                <select
                                    value={form.asesor}
                                    onChange={e => {
                                        const nuevoAsesor = e.target.value;
                                        // Si el validador seleccionado es el mismo que el nuevo asesor, limpiarlo
                                        const nuevoValidador = form.validador === nuevoAsesor ? '' : form.validador;
                                        setForm({ ...form, asesor: nuevoAsesor, validador: nuevoValidador });
                                    }}
                                    className="w-full p-2 border rounded"
                                    disabled={!form.supervisor}
                                    required
                                >
                                    <option value="">-- Seleccionar asesor --</option>
                                    {asesores.map(a => (
                                        <option key={a._id} value={a._id}>
                                            {a.nombre} ({a.role})
                                        </option>
                                    ))}
                                </select>
                                {!form.supervisor && (
                                    <p className="text-xs text-gray-500 mt-1">Primero selecciona un supervisor</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Campo original para Supervisor */}
                    {isSupervisor && (
                        <div>
                            <label className="block text-sm">Usuario del equipo (solo supervisores)</label>
                            <select
                                value={form.asesor}
                                onChange={e => {
                                    const nuevoAsesor = e.target.value;
                                    // Si el validador seleccionado es el mismo que el nuevo asesor, limpiarlo
                                    const nuevoValidador = form.validador === nuevoAsesor ? '' : form.validador;
                                    setForm({ ...form, asesor: nuevoAsesor, validador: nuevoValidador });
                                }}
                                className="w-full p-2 border rounded"
                            >
                                <option value="">-- Seleccionar usuario --</option>
                                {asesores.map(a => <option key={a._id} value={a._id}>{a.nombre} ({a.role})</option>)}
                            </select>
                        </div>
                    )}

                    {/* ✅ Campo Validador (obligatorio) */}
                    <div>
                        <label className="block text-sm font-medium">Validador <span className="text-red-500">*</span></label>
                        <select
                            value={form.validador}
                            onChange={e => setForm({ ...form, validador: e.target.value })}
                            className="w-full p-2 border rounded"
                            required
                        >
                            <option value="">-- Seleccionar validador --</option>
                            {validadores.map(v => (
                                <option key={v._id} value={v._id}>
                                    {v.nombre} ({v.role}) {v.numeroEquipo ? `- Equipo ${v.numeroEquipo} ` : ''}
                                </option>
                            ))}
                        </select>

                        {/* ✅ Checkbox para mostrar validadores de todos los equipos */}
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="otroEquipo"
                                checked={otroEquipo}
                                onChange={(e) => {
                                    setOtroEquipo(e.target.checked);
                                    // Limpiar validador seleccionado al cambiar
                                    setForm({ ...form, validador: '' });
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="otroEquipo" className="text-sm text-gray-700 cursor-pointer">
                                Pertenece a otro equipo
                            </label>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                            {otroEquipo
                                ? 'Mostrando todos los usuarios de la plataforma'
                                : isSupervisor
                                    ? 'Selecciona un compañero de tu equipo que validará la venta (puedes seleccionarte a ti mismo)'
                                    : 'Selecciona un compañero de tu equipo que validará la venta'
                            }
                        </p>
                    </div>

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