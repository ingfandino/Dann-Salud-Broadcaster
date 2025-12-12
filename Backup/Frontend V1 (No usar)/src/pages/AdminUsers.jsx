// frontend/src/pages/AdminUsers.jsx

import React, { useEffect, useState, useRef } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logger from "../utils/logger";
import { Edit, Trash2, Power, Eye, EyeOff, Key, RefreshCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Helper para formatear nombres de roles
const formatRoleName = (role) => {
    const roleNames = {
        'asesor': 'Asesor',
        'supervisor': 'Supervisor',
        'auditor': 'Auditor',
        'admin': 'Admin',
        'revendedor': 'Revendedor',
        'gerencia': 'Gerencia',
        'rrhh': 'RR.HH.'
    };
    return roleNames[role?.toLowerCase()] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : '');
};

export default function AdminUsers() {
    const { user: authUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [grupo, setGrupo] = useState("");
    const [grupos, setGrupos] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sort, setSort] = useState("createdAt");
    const [order, setOrder] = useState("desc");
    const [selectedUser, setSelectedUser] = useState(null);

    const navigate = useNavigate();
    const popupRef = useRef(null);

    const fetchUsers = async () => {
        try {
            const res = await apiClient.get("/users/admin/users", {
                params: { page, limit: 10, search, grupo, sortBy: sort, order },
            });
            setUsers(res.data.users);
            setTotalPages(res.data.pages || 1);
        } catch (err) {
            logger.error(err);
            toast.error("Error al obtener usuarios");
        } finally {
            setLoading(false);
        }
    };

    const fetchGrupos = async () => {
        try {
            const res = await apiClient.get("/users/admin/grupos");
            setGrupos(res.data.grupos || []);
        } catch (err) {
            logger.error(err);
            toast.error("Error al obtener grupos");
        }
    };

    const toggleActive = async (id) => {
        try {
            const res = await apiClient.patch(`/users/admin/users/${id}/toggle`);
            const newActive = res.data.active;
            toast.success(`Usuario ${newActive ? "activado" : "desactivado"} correctamente`);

            setUsers((prev) =>
                prev.map((u) => (u._id === id ? { ...u, active: newActive } : u))
            );
        } catch (err) {
            logger.error(err);
            toast.error("Error al actualizar usuario");
        }
    };

    const confirmDelete = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar este usuario? Esta acción es irreversible.")) {
            try {
                await apiClient.delete(`/users/admin/users/${id}`);
                toast.success("Usuario eliminado correctamente");
                setUsers((prev) => prev.filter((u) => u._id !== id));
            } catch (err) {
                logger.error(err);
                toast.error("Error al eliminar usuario");
            }
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line
    }, [page, sort, order, grupo]);

    useEffect(() => {
        fetchGrupos();
    }, []);

    // Obtener ID y rol del usuario actual
    const getCurrentUserId = () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return null;
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload?.id || null;
        } catch {
            return null;
        }
    };
    const currentUserId = getCurrentUserId();
    const getCurrentUserRole = () => {
        const ctxRole = (authUser?.role || "").toLowerCase();
        if (ctxRole) return ctxRole;
        try {
            const token = localStorage.getItem("token");
            if (!token) return "";
            const payload = JSON.parse(atob(token.split(".")[1]));
            return (payload?.role || "").toLowerCase();
        } catch {
            return "";
        }
    };
    const currentUserRole = getCurrentUserRole();

    // Cerrar popup si clic afuera
    useEffect(() => {
        const onDocClick = (e) => {
            if (!users.some(u => u.showRolePopup)) return;
            if (popupRef.current && popupRef.current.contains(e.target)) return;
            setUsers(prev => prev.map(u => ({ ...u, showRolePopup: false, pendingRole: undefined })));
        };

        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, [users]);

    if (loading) {
        return <p className="text-center mt-10">Cargando usuarios...</p>;
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white shadow-md rounded p-6 w-full max-w-5xl"
            >
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">👥 Gestión de Usuarios</h1>
                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
                    >
                        ← Volver al Menú
                    </button>
                </div>

                {/* 🔍 Búsqueda */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setPage(1);
                        fetchUsers();
                    }}
                    className="flex gap-2 mb-4"
                >
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 border p-2 rounded"
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Buscar
                    </button>
                </form>

                {/* 🔽 Filtros y Orden */}
                <div className="flex gap-2 mb-4 flex-wrap">
                    {/* Filtro por grupo */}
                    <select 
                        value={grupo} 
                        onChange={(e) => {
                            setGrupo(e.target.value);
                            setPage(1);
                        }} 
                        className="border p-2 rounded min-w-[180px]"
                    >
                        <option value="">🏢 Todos los grupos</option>
                        {grupos.map((g) => (
                            <option key={g} value={g}>
                                Grupo {g}
                            </option>
                        ))}
                    </select>

                    {/* Ordenar por */}
                    <select value={sort} onChange={(e) => setSort(e.target.value)} className="border p-2 rounded">
                        <option value="createdAt">Fecha creación</option>
                        <option value="email">Email</option>
                        <option value="nombre">Nombre</option>
                        <option value="role">Rol</option>
                    </select>

                    {/* Orden */}
                    <select value={order} onChange={(e) => setOrder(e.target.value)} className="border p-2 rounded">
                        <option value="asc">Ascendente</option>
                        <option value="desc">Descendente</option>
                    </select>

                    {/* Botón para limpiar filtros */}
                    {(search || grupo) && (
                        <button
                            onClick={() => {
                                setSearch("");
                                setGrupo("");
                                setPage(1);
                            }}
                            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                            title="Limpiar filtros"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* 📋 Tabla */}
                {users.length === 0 ? (
                    <p className="text-gray-600 text-center">No hay usuarios registrados.</p>
                ) : (
                    <div className="overflow-x-auto -mx-2 md:mx-0">
                        <div className="md:hidden text-xs text-gray-500 mb-2 text-center">
                            👈 Desliza para ver más columnas →
                        </div>
                        <table className="w-full border-collapse relative min-w-[600px]">
                            <thead>
                                <tr className="bg-gray-200">
                                    <th className="p-1 md:p-2 border text-xs md:text-base">Nombre</th>
                                    <th className="p-1 md:p-2 border text-xs md:text-base">Email</th>
                                    <th className="p-1 md:p-2 border text-xs md:text-base">Rol</th>
                                    <th className="p-1 md:p-2 border text-xs md:text-base">Grupo</th>
                                    <th className="p-1 md:p-2 border text-xs md:text-base">Estado</th>
                                    <th className="p-1 md:p-2 border text-xs md:text-base">Acciones</th>
                                </tr>
                            </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id} className="text-center relative text-xs md:text-base">
                                    <td className="p-1 md:p-2 border">{u.nombre}</td>
                                    <td className="p-1 md:p-2 border truncate max-w-[120px] md:max-w-none" title={u.email}>{u.email}</td>

                                    {/* Rol con popup (permitido para cualquier rol; el backend impide cambiar el propio) */}
                                    <td className="p-1 md:p-2 border relative">
                                        <div className="relative inline-block">
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUsers((prev) =>
                                                        prev.map((usr) =>
                                                            usr._id === u._id
                                                                ? { ...usr, showRolePopup: !usr.showRolePopup }
                                                                : { ...usr, showRolePopup: false }
                                                        )
                                                    );
                                                }}
                                                className="cursor-pointer text-indigo-600 font-semibold hover:underline"
                                            >
                                                {formatRoleName(u.role)}
                                            </span>

                                            <AnimatePresence>
                                                {u.showRolePopup && (
                                                    <motion.div
                                                        ref={popupRef}
                                                        initial={{ opacity: 0, scale: 0.95, y: -6 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -6 }}
                                                        transition={{ duration: 0.18, ease: "easeInOut" }}
                                                        className="absolute z-50 top-6 left-0 bg-white border border-gray-300 rounded shadow-lg w-44 p-2"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <p className="text-sm text-gray-600 mb-2">Cambiar rol a:</p>
                                                        <div className="flex flex-col gap-1">
                                                            {["asesor", "supervisor", "auditor", "admin", "revendedor", "gerencia", "rrhh"].map((r) => (
                                                                <button
                                                                    key={r}
                                                                    onClick={() =>
                                                                        setUsers((prev) =>
                                                                            prev.map((usr) =>
                                                                                usr._id === u._id
                                                                                    ? { ...usr, pendingRole: r }
                                                                                    : usr
                                                                            )
                                                                        )
                                                                    }
                                                                    disabled={(u.role || '').toLowerCase() === "gerencia"}
                                                                    className={`p-1 rounded text-sm ${u.pendingRole === r
                                                                        ? "bg-blue-500 text-white"
                                                                        : "bg-gray-100 hover:bg-gray-200"
                                                                        } ${(u.role || '').toLowerCase() === "gerencia" ? "opacity-50 cursor-not-allowed" : ""}`}
                                                                >
                                                                    {formatRoleName(r)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        {(u.role || '').toLowerCase() === "gerencia" && (
                                                            <p className="mt-2 text-xs text-red-600">No se puede modificar el rol de una cuenta de Gerencia.</p>
                                                        )}
                                                        <div className="flex justify-end gap-2 mt-2">
                                                            <button
                                                                onClick={() =>
                                                                    setUsers((prev) =>
                                                                        prev.map((usr) =>
                                                                            usr._id === u._id
                                                                                ? {
                                                                                    ...usr,
                                                                                    showRolePopup: false,
                                                                                    pendingRole: undefined,
                                                                                }
                                                                                : usr
                                                                        )
                                                                    )
                                                                }
                                                                className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    const newRole = u.pendingRole || u.role;
                                                                    if (newRole === u.role) {
                                                                        toast.info("No hay cambios en el rol");
                                                                        setUsers((prev) =>
                                                                            prev.map((usr) =>
                                                                                usr._id === u._id
                                                                                    ? {
                                                                                        ...usr,
                                                                                        showRolePopup: false,
                                                                                        pendingRole: undefined,
                                                                                    }
                                                                                    : usr
                                                                            )
                                                                        );
                                                                        return;
                                                                    }
                                                                    try {
                                                                        await apiClient.patch(
                                                                            `/users/admin/users/${u._id}/role`,
                                                                            { role: newRole }
                                                                        );
                                                                        toast.success("Rol actualizado correctamente");
                                                                        setUsers((prev) =>
                                                                            prev.map((usr) =>
                                                                                usr._id === u._id
                                                                                    ? {
                                                                                        ...usr,
                                                                                        role: newRole,
                                                                                        showRolePopup: false,
                                                                                        pendingRole: undefined,
                                                                                    }
                                                                                    : usr
                                                                            )
                                                                        );
                                                                    } catch (err) {
                                                                        logger.error(err);
                                                                        toast.error(
                                                                            err.response?.data?.error ||
                                                                            "Error al actualizar rol"
                                                                        );
                                                                    }
                                                                }}
                                                                className="text-xs px-2 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
                                                            >
                                                                Guardar
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </td>

                                    {/* Grupo (solo número) */}
                                    <td className="p-1 md:p-2 border">{u.numeroEquipo ?? "—"}</td>

                                    {/* Estado */}
                                    <td className="p-1 md:p-2 border">
                                        <span className={`font-semibold ${u.active ? "text-green-600" : "text-red-600"}`}>
                                            {u.active ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>

                                    {/* Acciones con íconos */}
                                    <td className="p-1 md:p-2 border flex justify-center gap-1 md:gap-2">
                                        <button
                                            onClick={() => toggleActive(u._id)}
                                            disabled={u._id === currentUserId}
                                            className={`p-1 md:p-2 rounded text-white ${u.active
                                                ? "bg-red-500 hover:bg-red-600"
                                                : "bg-green-500 hover:bg-green-600"
                                                }`}
                                            title={u.active ? "Desactivar" : "Activar"}
                                        >
                                            <Power size={14} className="md:w-[18px] md:h-[18px]" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedUser(u)}
                                            disabled={u._id === currentUserId}
                                            className="p-1 md:p-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-50"
                                            title="Editar"
                                        >
                                            <Edit size={14} className="md:w-[18px] md:h-[18px]" />
                                        </button>
                                        <button
                                            onClick={() => confirmDelete(u._id)}
                                            disabled={(u._id === currentUserId) || (u.role || '').toLowerCase() === "gerencia" || ((u.role || '').toLowerCase() === "admin" && currentUserRole !== "gerencia")}
                                            className="p-1 md:p-2 rounded bg-gray-500 hover:bg-gray-600 text-white disabled:opacity-50"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={14} className="md:w-[18px] md:h-[18px]" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}

                {/* Paginación */}
                <div className="flex justify-center gap-2 mt-4">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
                        ⬅️ Anterior
                    </button>
                    <span className="px-3 py-1">Página {page} de {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50">
                        Siguiente ➡️
                    </button>
                </div>

                {/* Modal de Edición */}
                {selectedUser && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 10 }}
                            transition={{ duration: 0.18, ease: "easeInOut" }}
                            className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg"
                        >
                            <div className="flex items-center justify-between mb-4 border-b pb-2">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-700">
                                    <Edit size={18} /> Editar usuario
                                </h2>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="p-2 rounded hover:bg-gray-100"
                                    title="Cerrar"
                                >
                                    ✖
                                </button>
                            </div>

                            {/* Campos del formulario */}
                            <div className="flex flex-col gap-3">
                                {/* Nombre */}
                                <label className="text-sm text-gray-600">Nombre</label>
                                <input
                                    type="text"
                                    value={selectedUser.nombre || ""}
                                    onChange={(e) =>
                                        setSelectedUser({ ...selectedUser, nombre: e.target.value })
                                    }
                                    className="border p-2 rounded"
                                    placeholder="Nombre"
                                />

                                {/* Email */}
                                <label className="text-sm text-gray-600">Email</label>
                                <input
                                    type="email"
                                    value={selectedUser.email || ""}
                                    onChange={(e) =>
                                        setSelectedUser({ ...selectedUser, email: e.target.value })
                                    }
                                    className="border p-2 rounded"
                                    placeholder="Correo electrónico"
                                />

                                {/* Contraseña actual */}
                                <label className="text-sm text-gray-600">Contraseña actual</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type={selectedUser.showPassword ? "text" : "password"}
                                        value={selectedUser.currentPassword || "********"}
                                        readOnly
                                        className="flex-1 border p-2 rounded bg-gray-50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedUser({
                                                ...selectedUser,
                                                showPassword: !selectedUser.showPassword,
                                            })
                                        }
                                        className="p-2 rounded bg-gray-100 hover:bg-gray-200"
                                    >
                                        {selectedUser.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    Por seguridad no se muestra la contraseña real (está hasheada). Solo visible si guardas una temporal.
                                </p>

                                {/* Nueva contraseña */}
                                <label className="text-sm text-gray-600">Nueva contraseña (opcional)</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={selectedUser.password || ""}
                                        onChange={(e) =>
                                            setSelectedUser({ ...selectedUser, password: e.target.value })
                                        }
                                        className="flex-1 border p-2 rounded"
                                        placeholder="Escribe una nueva contraseña (o deja vacío)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
                                            const temp = Array.from({ length: 10 })
                                                .map(() => chars[Math.floor(Math.random() * chars.length)])
                                                .join("");
                                            setSelectedUser({ ...selectedUser, password: temp });
                                            toast.info("Contraseña temporal generada");
                                        }}
                                        className="p-2 rounded bg-gray-100 hover:bg-gray-200"
                                        title="Generar contraseña temporal"
                                    >
                                        <RefreshCcw size={16} />
                                    </button>
                                </div>

                                {/* Grupo (alfanumérico) */}
                                <label className="text-sm text-gray-600">Grupo</label>
                                <input
                                    type="text"
                                    value={selectedUser.numeroEquipo || ""}
                                    onChange={(e) =>
                                        setSelectedUser({ ...selectedUser, numeroEquipo: e.target.value })
                                    }
                                    className="border p-2 rounded"
                                    placeholder="Grupo (alfanumérico)"
                                />

                                {/* Acciones */}
                                <div className="flex justify-end gap-3 mt-4">
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            try {
                                                const payload = {
                                                    nombre: selectedUser.nombre,
                                                    email: selectedUser.email,
                                                    numeroEquipo: selectedUser.numeroEquipo,
                                                };
                                                if (selectedUser.password)
                                                    payload.password = selectedUser.password;

                                                await apiClient.put(`/users/${selectedUser._id}`, payload);
                                                toast.success("Usuario actualizado correctamente");
                                                setSelectedUser(null);
                                                fetchUsers();
                                            } catch (err) {
                                                logger.error(err);
                                                toast.error("Error al actualizar usuario");
                                            }
                                        }}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}