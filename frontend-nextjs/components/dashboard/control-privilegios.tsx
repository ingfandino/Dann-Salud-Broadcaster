'use client';

/**
 * ============================================================
 * CONTROL DE PRIVILEGIOS
 * ============================================================
 * Interfaz dinámica de gestión de permisos por rol.
 * Pertenece al módulo: Configuración de sistema
 * Acceso: gerencia, desarrollador
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, History, ChevronDown, ChevronRight, Check, Save, AlertTriangle, Layers, Layout, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTheme } from './theme-provider';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface PermissionSet {
    acceder:  boolean;
    ver:      boolean;
    editar:   boolean;
    eliminar: boolean;
}

interface InterfaceItem {
    id:    string;
    label: string;
}

interface ModuleItem {
    id:         string;
    label:      string;
    interfaces: InterfaceItem[];
}

interface RolePermissionRecord {
    role:        string;
    moduleId:    string;
    interfaceId: string;
    level:       'module' | 'interface';
    permissions: PermissionSet;
}

interface AuditLogEntry {
    _id:                 string;
    changedBy:           { nombre: string; email: string; role: string } | null;
    role:                string;
    moduleId:            string;
    interfaceId:         string;
    level:               string;
    previousPermissions: PermissionSet | null;
    newPermissions:      PermissionSet;
    timestamp:           string;
}

const EMPTY_PERMS: PermissionSet = { acceder: false, ver: false, editar: false, eliminar: false };

// ─────────────────────────────────────────────
// ROLE DISPLAY NAMES
// ─────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
    gerencia:       'Gerencia',
    administrativo: 'Administrativo',
    supervisor:     'Supervisor',
    asesor:         'Asesor',
    auditor:        'Auditor',
    'RR.HH':        'RR.HH.',
    recuperador:    'Recuperador',
    encargado:      'Encargado',
    independiente:  'Independiente',
};

// ─────────────────────────────────────────────
// PERMISSION CHECKBOX COMPONENT
// ─────────────────────────────────────────────
function PermCheckbox({
    label,
    checked,
    onChange,
    disabled = false,
    accent = false,
}: {
    label:    string;
    checked:  boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    accent?:   boolean;
}) {
    const { theme } = useTheme();
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all select-none',
                checked
                    ? accent
                        ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-500/30'
                        : theme === 'dark'
                            ? 'bg-emerald-600/80 border-emerald-500 text-white'
                            : 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                    : theme === 'dark'
                        ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
                disabled && 'opacity-40 cursor-not-allowed',
            )}
        >
            <span
                className={cn(
                    'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all',
                    checked
                        ? 'bg-white/30 border-white/50'
                        : theme === 'dark'
                            ? 'border-white/20'
                            : 'border-gray-300',
                )}
            >
                {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
            </span>
            {label}
        </button>
    );
}

// ─────────────────────────────────────────────
// PERMISSION ROW COMPONENT
// ─────────────────────────────────────────────
function PermissionRow({
    label,
    sublabel,
    perms,
    onChange,
    isModule = false,
}: {
    label:     string;
    sublabel?: string;
    perms:     PermissionSet;
    onChange:  (p: PermissionSet) => void;
    isModule?: boolean;
}) {
    const { theme } = useTheme();

    const handleTodo = (v: boolean) => {
        onChange({ acceder: v, ver: v, editar: v, eliminar: v });
    };

    const handlePerm = (key: keyof PermissionSet) => (v: boolean) => {
        const next = { ...perms, [key]: v };
        onChange(next);
    };

    const isTodo = perms.acceder && perms.ver && perms.editar && perms.eliminar;

    return (
        <div
            className={cn(
                'rounded-xl border p-4 transition-all',
                isModule
                    ? theme === 'dark'
                        ? 'border-purple-500/30 bg-purple-900/10'
                        : 'border-purple-200 bg-purple-50/50'
                    : theme === 'dark'
                        ? 'border-white/8 bg-white/3'
                        : 'border-gray-100 bg-white',
            )}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Label */}
                <div className="flex-1 min-w-0">
                    <div className={cn('font-medium text-sm', theme === 'dark' ? 'text-white' : 'text-gray-800')}>
                        {label}
                    </div>
                    {sublabel && (
                        <div className={cn('text-xs mt-0.5', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                            {sublabel}
                        </div>
                    )}
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-2">
                    <PermCheckbox label="Acceder" checked={perms.acceder} onChange={handlePerm('acceder')} />
                    <PermCheckbox label="Ver"     checked={perms.ver}     onChange={handlePerm('ver')} />
                    <PermCheckbox label="Editar"  checked={perms.editar}  onChange={handlePerm('editar')} />
                    <PermCheckbox label="Eliminar" checked={perms.eliminar} onChange={handlePerm('eliminar')} />
                    <PermCheckbox label="Todo" checked={isTodo} onChange={handleTodo} accent />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// AUDIT LOG TAB
// ─────────────────────────────────────────────
function AuditLogTab() {
    const { theme } = useTheme();
    const [logs, setLogs]     = useState<AuditLogEntry[]>([]);
    const [total, setTotal]   = useState(0);
    const [loading, setLoading] = useState(false);
    const [roleFilter, setRoleFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { limit: 50 };
            if (roleFilter) params.role = roleFilter;
            const res = await api.privileges.getAuditLog(params);
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch {
            toast.error('No se pudo cargar el historial');
        } finally {
            setLoading(false);
        }
    }, [roleFilter]);

    useEffect(() => { load(); }, [load]);

    const formatPerms = (p: PermissionSet | null) => {
        if (!p) return '—';
        const on = Object.entries(p).filter(([, v]) => v).map(([k]) => k);
        return on.length ? on.join(', ') : 'ninguno';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className={cn(
                        'px-3 py-2 rounded-lg border text-sm',
                        theme === 'dark'
                            ? 'bg-white/5 border-white/10 text-white'
                            : 'bg-white border-gray-200 text-gray-700',
                    )}
                >
                    <option value="">Todos los roles</option>
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
                <button
                    onClick={load}
                    className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm',
                        theme === 'dark'
                            ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                >
                    <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                    Actualizar
                </button>
                <span className={cn('text-sm', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                    {total} registros
                </span>
            </div>

            <div className="space-y-2">
                {logs.length === 0 && !loading && (
                    <div className={cn('text-center py-10 text-sm', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                        No hay registros de auditoría
                    </div>
                )}
                {logs.map(log => (
                    <div
                        key={log._id}
                        className={cn(
                            'rounded-xl border p-4 text-sm',
                            theme === 'dark'
                                ? 'border-white/8 bg-white/3'
                                : 'border-gray-100 bg-white',
                        )}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-semibold',
                                    theme === 'dark' ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700',
                                )}>
                                    {ROLE_LABELS[log.role] || log.role}
                                </span>
                                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                                    {log.interfaceId}
                                </span>
                            </div>
                            <span className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                                {new Date(log.timestamp).toLocaleString('es-AR')}
                            </span>
                        </div>
                        <div className={cn('text-xs space-y-1', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                            <div>
                                <span className="font-medium">Por:</span>{' '}
                                {log.changedBy?.nombre || '—'} ({log.changedBy?.email || '—'})
                            </div>
                            <div>
                                <span className="font-medium">Antes:</span> {formatPerms(log.previousPermissions)}
                                {' → '}
                                <span className="font-medium">Después:</span> {formatPerms(log.newPermissions as PermissionSet)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function ControlPrivilegios() {
    const { theme } = useTheme();

    // Structure from API
    const [structure, setStructure]   = useState<ModuleItem[]>([]);
    const [roles, setRoles]           = useState<string[]>([]);
    const [loadingStructure, setLoadingStructure] = useState(true);

    // UI state
    const [activeTab, setActiveTab]   = useState<'permisos' | 'auditoria'>('permisos');
    const [mode, setMode]             = useState<'module' | 'interface'>('interface');
    const [selectedRole, setSelectedRole]         = useState('');
    const [selectedModule, setSelectedModule]     = useState('');
    const [selectedInterface, setSelectedInterface] = useState('');
    const [expandedModules, setExpandedModules]   = useState<Set<string>>(new Set());

    // Permissions state: key = interfaceId → PermissionSet
    const [permsMap, setPermsMap]     = useState<Record<string, PermissionSet>>({});
    const [originalMap, setOriginalMap] = useState<Record<string, PermissionSet>>({});
    const [loadingPerms, setLoadingPerms] = useState(false);
    const [saving, setSaving]         = useState(false);

    // ── Load structure ──
    useEffect(() => {
        api.privileges.getStructure()
            .then(res => {
                setStructure(res.data.structure || []);
                setRoles(res.data.roles || []);
                setLoadingStructure(false);
            })
            .catch(() => {
                toast.error('No se pudo cargar la estructura de la plataforma');
                setLoadingStructure(false);
            });
    }, []);

    // ── Load permissions when role changes ──
    useEffect(() => {
        if (!selectedRole) {
            setPermsMap({});
            setOriginalMap({});
            return;
        }

        setLoadingPerms(true);
        api.privileges.getByRole(selectedRole)
            .then(res => {
                const records: RolePermissionRecord[] = res.data.permissions || [];
                const map: Record<string, PermissionSet> = {};
                for (const r of records) {
                    map[r.interfaceId] = r.permissions;
                }
                setPermsMap(map);
                setOriginalMap(map);
            })
            .catch(() => toast.error('No se pudieron cargar los permisos del rol'))
            .finally(() => setLoadingPerms(false));
    }, [selectedRole]);

    // ── Compute dirty state ──
    const isDirty = JSON.stringify(permsMap) !== JSON.stringify(originalMap);

    // ── Get effective perms for an interfaceId ──
    const getPerms = (interfaceId: string): PermissionSet =>
        permsMap[interfaceId] || { ...EMPTY_PERMS };

    // ── Update perms locally ──
    const updatePerms = (interfaceId: string, p: PermissionSet) => {
        setPermsMap(prev => ({ ...prev, [interfaceId]: p }));
    };

    // ── Handle module-level change: apply to all children ──
    const updateModulePerms = (moduleId: string, p: PermissionSet) => {
        const mod = structure.find(m => m.id === moduleId);
        if (!mod) return;
        const next = { ...permsMap };
        for (const iface of mod.interfaces) {
            next[iface.id] = { ...p };
        }
        setPermsMap(next);
    };

    // ── Get aggregate perms for a module (all-true only if all children agree) ──
    const getModuleAggregate = (mod: ModuleItem): PermissionSet => {
        if (mod.interfaces.length === 0) return { ...EMPTY_PERMS };
        const first = getPerms(mod.interfaces[0].id);
        const agg: PermissionSet = { ...first };
        for (const iface of mod.interfaces.slice(1)) {
            const p = getPerms(iface.id);
            agg.acceder  = agg.acceder  && p.acceder;
            agg.ver       = agg.ver      && p.ver;
            agg.editar    = agg.editar   && p.editar;
            agg.eliminar  = agg.eliminar && p.eliminar;
        }
        return agg;
    };

    // ── Save ──
    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            // Always save each changed interface individually.
            // Using module-level aggregate (AND of all interfaces) would incorrectly
            // overwrite individual interface settings with a single uniform value.
            const allIds = new Set([...Object.keys(originalMap), ...Object.keys(permsMap)]);
            const changedIds = [...allIds].filter(id => {
                const orig = originalMap[id] ?? { ...EMPTY_PERMS };
                const curr = permsMap[id]  ?? { ...EMPTY_PERMS };
                return JSON.stringify(curr) !== JSON.stringify(orig);
            });

            for (const ifaceId of changedIds) {
                const parentMod = structure.find(m => m.interfaces.some(i => i.id === ifaceId));
                if (!parentMod) continue;
                await api.privileges.upsert({
                    role: selectedRole,
                    moduleId: parentMod.id,
                    interfaceId: ifaceId,
                    level: 'interface',
                    permissions: permsMap[ifaceId] ?? { ...EMPTY_PERMS },
                });
            }

            setOriginalMap({ ...permsMap });
            toast.success('Permisos guardados correctamente');
        } catch (err: any) {
            const msg = err?.response?.data?.error || 'Error al guardar permisos';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Toggle module expand ──
    const toggleModule = (id: string) => {
        setExpandedModules(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────

    const cardClass = cn(
        'rounded-2xl border',
        theme === 'dark' ? 'border-white/8 bg-white/3' : 'border-gray-100 bg-white shadow-sm',
    );

    const labelClass = cn('text-xs font-semibold uppercase tracking-wide mb-2', theme === 'dark' ? 'text-gray-400' : 'text-gray-500');

    return (
        <div className="max-w-6xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            theme === 'dark'
                                ? 'bg-gradient-to-br from-purple-600 to-indigo-600'
                                : 'bg-gradient-to-br from-[#00C794] to-[#0078A0]',
                        )}>
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <h1 className={cn('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-gray-800')}>
                            Control de privilegios
                        </h1>
                    </div>
                    <p className={cn('text-sm ml-13', theme === 'dark' ? 'text-gray-400' : 'text-gray-500')}>
                        Configuración dinámica de permisos por rol y módulo
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('permisos')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                            activeTab === 'permisos'
                                ? theme === 'dark'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-[#00C794] text-white'
                                : theme === 'dark'
                                    ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
                    >
                        <Shield className="w-4 h-4" />
                        Permisos
                    </button>
                    <button
                        onClick={() => setActiveTab('auditoria')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                            activeTab === 'auditoria'
                                ? theme === 'dark'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-[#00C794] text-white'
                                : theme === 'dark'
                                    ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                        )}
                    >
                        <History className="w-4 h-4" />
                        Auditoría
                    </button>
                </div>
            </div>

            {activeTab === 'auditoria' && (
                <div className={cn(cardClass, 'p-6')}>
                    <AuditLogTab />
                </div>
            )}

            {activeTab === 'permisos' && (
                <>
                    {/* ── Controls row ── */}
                    <div className={cn(cardClass, 'p-5')}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

                            {/* Mode selector */}
                            <div>
                                <div className={labelClass}>Modo de configuración</div>
                                <div className="flex rounded-xl overflow-hidden border border-white/10">
                                    <button
                                        onClick={() => setMode('module')}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all',
                                            mode === 'module'
                                                ? theme === 'dark'
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-[#00C794] text-white'
                                                : theme === 'dark'
                                                    ? 'bg-white/5 text-gray-400 hover:text-white'
                                                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
                                        )}
                                    >
                                        <Layers className="w-4 h-4" />
                                        Por módulo
                                    </button>
                                    <button
                                        onClick={() => setMode('interface')}
                                        className={cn(
                                            'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium transition-all border-l',
                                            mode === 'interface'
                                                ? theme === 'dark'
                                                    ? 'bg-purple-600 text-white border-purple-500'
                                                    : 'bg-[#00C794] text-white border-[#00a87c]'
                                                : theme === 'dark'
                                                    ? 'bg-white/5 text-gray-400 hover:text-white border-white/10'
                                                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-gray-200',
                                        )}
                                    >
                                        <Layout className="w-4 h-4" />
                                        Por interfaz
                                    </button>
                                </div>
                                <p className={cn('text-xs mt-2', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                                    {mode === 'module'
                                        ? 'Aplica a todas las interfaces del módulo'
                                        : 'Configura cada interfaz individualmente'}
                                </p>
                            </div>

                            {/* Role selector */}
                            <div>
                                <div className={labelClass}>Rol a configurar</div>
                                <select
                                    value={selectedRole}
                                    onChange={e => {
                                        setSelectedRole(e.target.value);
                                        setSelectedModule('');
                                        setSelectedInterface('');
                                    }}
                                    className={cn(
                                        'w-full px-3 py-2.5 rounded-xl border text-sm',
                                        theme === 'dark'
                                            ? 'bg-white/5 border-white/10 text-white'
                                            : 'bg-white border-gray-200 text-gray-700',
                                    )}
                                >
                                    <option value="">-- Seleccionar rol --</option>
                                    {roles.map(r => (
                                        <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
                                    ))}
                                </select>
                                {selectedRole === 'gerencia' && (
                                    <div className={cn(
                                        'flex items-center gap-1.5 mt-2 text-xs',
                                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
                                    )}>
                                        <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                        Gerencia siempre tiene acceso total
                                    </div>
                                )}
                            </div>

                            {/* Save button */}
                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={!selectedRole || !isDirty || saving}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                                        !selectedRole || !isDirty || saving
                                            ? 'opacity-40 cursor-not-allowed bg-gray-400 text-white'
                                            : theme === 'dark'
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/20'
                                                : 'bg-gradient-to-r from-[#00C794] to-[#0078A0] text-white hover:opacity-90 shadow-lg shadow-[#00C794]/30',
                                    )}
                                >
                                    {saving
                                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                                        : <Save className="w-4 h-4" />}
                                    {saving ? 'Guardando...' : isDirty ? 'Guardar cambios' : 'Sin cambios'}
                                </button>
                                {isDirty && (
                                    <p className={cn('text-xs text-center mt-2', theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>
                                        Tienes cambios sin guardar
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Info banner ── */}
                    {!selectedRole && (
                        <div className={cn(
                            'flex items-center gap-3 px-5 py-4 rounded-xl border',
                            theme === 'dark' ? 'border-blue-500/20 bg-blue-500/5 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700',
                        )}>
                            <Info className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm">Selecciona un rol para ver y editar sus permisos.</span>
                        </div>
                    )}

                    {/* ── Security warning ── */}
                    <div className={cn(
                        'flex items-start gap-3 px-5 py-4 rounded-xl border',
                        theme === 'dark' ? 'border-amber-500/20 bg-amber-500/5 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700',
                    )}>
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                            El rol <strong>Desarrollador</strong> siempre tiene acceso total y no puede ser restringido.
                            El acceso a <strong>Configuración de sistema</strong> no puede eliminarse del último rol que lo posee.
                        </span>
                    </div>

                    {/* ── Permissions editor ── */}
                    {selectedRole && !loadingPerms && (
                        <div className="space-y-4">
                            {mode === 'module' ? (
                                /* ── MODULE MODE: one row per module ── */
                                structure.map(mod => {
                                    const aggPerms = getModuleAggregate(mod);
                                    const isExpanded = expandedModules.has(mod.id);
                                    return (
                                        <div key={mod.id} className={cn(cardClass, 'overflow-hidden')}>
                                            {/* Module header row */}
                                            <div className="p-4">
                                                <PermissionRow
                                                    label={mod.label}
                                                    sublabel={`${mod.interfaces.length} interfaz${mod.interfaces.length !== 1 ? 'es' : ''}`}
                                                    perms={aggPerms}
                                                    onChange={p => updateModulePerms(mod.id, p)}
                                                    isModule
                                                />
                                            </div>

                                            {/* Toggle to see individual interfaces */}
                                            <button
                                                onClick={() => toggleModule(mod.id)}
                                                className={cn(
                                                    'w-full flex items-center gap-2 px-4 py-2 text-xs border-t transition-all',
                                                    theme === 'dark'
                                                        ? 'border-white/8 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                                        : 'border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50',
                                                )}
                                            >
                                                {isExpanded
                                                    ? <ChevronDown className="w-3.5 h-3.5" />
                                                    : <ChevronRight className="w-3.5 h-3.5" />}
                                                {isExpanded ? 'Ocultar interfaces' : 'Ver interfaces individuales'}
                                            </button>

                                            {isExpanded && (
                                                <div className={cn(
                                                    'px-4 pb-4 space-y-2',
                                                    theme === 'dark' ? 'bg-white/2' : 'bg-gray-50/50',
                                                )}>
                                                    {mod.interfaces.map(iface => (
                                                        <PermissionRow
                                                            key={iface.id}
                                                            label={iface.label}
                                                            sublabel={iface.id}
                                                            perms={getPerms(iface.id)}
                                                            onChange={p => updatePerms(iface.id, p)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                /* ── INTERFACE MODE: all modules expanded ── */
                                structure.map(mod => (
                                    <div key={mod.id} className={cn(cardClass, 'overflow-hidden')}>
                                        {/* Module label */}
                                        <div className={cn(
                                            'px-5 py-3 border-b flex items-center gap-2',
                                            theme === 'dark'
                                                ? 'border-white/8 bg-white/3'
                                                : 'border-gray-100 bg-gray-50/60',
                                        )}>
                                            <Layers className={cn('w-4 h-4', theme === 'dark' ? 'text-purple-400' : 'text-[#00C794]')} />
                                            <span className={cn('font-semibold text-sm', theme === 'dark' ? 'text-white' : 'text-gray-700')}>
                                                {mod.label}
                                            </span>
                                            <span className={cn('text-xs', theme === 'dark' ? 'text-gray-500' : 'text-gray-400')}>
                                                ({mod.interfaces.length} interfaces)
                                            </span>
                                        </div>

                                        {/* Interface rows */}
                                        <div className="p-4 space-y-3">
                                            {mod.interfaces.map(iface => (
                                                <PermissionRow
                                                    key={iface.id}
                                                    label={iface.label}
                                                    sublabel={iface.id}
                                                    perms={getPerms(iface.id)}
                                                    onChange={p => updatePerms(iface.id, p)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {loadingPerms && selectedRole && (
                        <div className="flex items-center justify-center py-16">
                            <RefreshCw className={cn('w-6 h-6 animate-spin', theme === 'dark' ? 'text-purple-400' : 'text-[#00C794]')} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
