// frontend/src/pages/InternalMessages.jsx

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";

export default function InternalMessages({ onClose }) {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("inbox");
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [composing, setComposing] = useState(false);

    // Estado del compositor
    const [composeForm, setComposeForm] = useState({
        to: [], // Array de IDs de destinatarios
        roles: [], // Array de roles seleccionados
        subject: "",
        content: "",
        attachments: [],
        replyTo: null,
        isForward: false
    });

    const [recipients, setRecipients] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]); // Array de objetos {_id, nombre}
    const [selectedRoles, setSelectedRoles] = useState([]); // Array de roles seleccionados
    const [recipientSearch, setRecipientSearch] = useState("");
    const [recipientMode, setRecipientMode] = useState("users"); // "users" o "roles"
    const fileInputRef = useRef(null);

    // Roles disponibles en el sistema
    const availableRoles = [
        { value: "admin", label: "Administradores", icon: "👑" },
        { value: "gerencia", label: "Gerencia", icon: "💼" },
        { value: "supervisor", label: "Supervisores", icon: "👔" },
        { value: "auditor", label: "Auditores", icon: "🔍" },
        { value: "asesor", label: "Asesores", icon: "📞" },
        { value: "revendedor", label: "Revendedores", icon: "🔄" }
    ];

    useEffect(() => {
        loadMessages();
    }, [activeTab]);

    useEffect(() => {
        if (recipientSearch.length > 1) {
            searchRecipients(recipientSearch);
        } else {
            setRecipients([]);
        }
    }, [recipientSearch]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            let endpoint = "/internal-messages/inbox";

            if (activeTab === "sent") endpoint = "/internal-messages/sent";
            if (activeTab === "starred") endpoint = "/internal-messages/starred";

            const res = await apiClient.get(endpoint);
            setMessages(res.data.messages || []);
        } catch (err) {
            logger.error("Error cargando mensajes:", err);
            toast.error("Error cargando mensajes");
        } finally {
            setLoading(false);
        }
    };

    const searchRecipients = async (query) => {
        try {
            const res = await apiClient.get("/internal-messages/recipients", {
                params: { q: query }
            });
            setRecipients(res.data);
        } catch (err) {
            logger.error("Error buscando destinatarios:", err);
        }
    };

    const handleSelectMessage = async (message) => {
        try {
            const res = await apiClient.get(`/internal-messages/${message._id}`);
            setSelectedMessage(res.data);

            // Actualizar mensaje en la lista si fue marcado como leído
            if (!message.read && res.data.read) {
                setMessages(prev =>
                    prev.map(m => m._id === message._id ? { ...m, read: true } : m)
                );
            }
        } catch (err) {
            logger.error("Error cargando mensaje:", err);
            toast.error("Error cargando mensaje");
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        // Validar que haya al menos un destinatario (usuarios o roles)
        const hasRecipients = composeForm.to.length > 0 || composeForm.roles.length > 0;
        if (!hasRecipients || !composeForm.content) {
            toast.error("Selecciona al menos un destinatario (usuario o rol) y escribe un mensaje");
            return;
        }

        try {
            const formData = new FormData();

            // Enviar por ROLES o por USUARIOS
            if (composeForm.roles.length > 0) {
                composeForm.roles.forEach(role => {
                    formData.append("roles[]", role);
                });
            } else {
                composeForm.to.forEach(recipientId => {
                    formData.append("to[]", recipientId);
                });
            }

            formData.append("subject", composeForm.subject);
            formData.append("content", composeForm.content);

            if (composeForm.replyTo) {
                formData.append("replyTo", composeForm.replyTo);
            }

            if (composeForm.isForward) {
                formData.append("isForward", "true");
            }

            // Agregar archivos adjuntos
            composeForm.attachments.forEach(file => {
                formData.append("attachments", file);
            });

            const res = await apiClient.post("/internal-messages", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const actionType = composeForm.isForward ? "reenviado" : (composeForm.replyTo ? "respondido" : "enviado");
            toast.success(`✅ Mensaje ${actionType} a ${res.data.sentCount} destinatario(s)`);

            resetComposer();
            setActiveTab("sent");
            loadMessages();
        } catch (err) {
            logger.error("Error enviando mensaje:", err);
            toast.error("Error enviando mensaje");
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setComposeForm(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...files]
        }));
    };

    const removeAttachment = (index) => {
        setComposeForm(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const addRecipient = (recipient) => {
        // Evitar duplicados
        if (composeForm.to.includes(recipient._id)) {
            toast.warning("Este destinatario ya está agregado");
            return;
        }

        setComposeForm(prev => ({
            ...prev,
            to: [...prev.to, recipient._id]
        }));

        setSelectedRecipients(prev => [
            ...prev,
            { _id: recipient._id, nombre: recipient.nombre, email: recipient.email }
        ]);

        setRecipientSearch("");
        setRecipients([]);
    };

    const removeRecipient = (recipientId) => {
        setComposeForm(prev => ({
            ...prev,
            to: prev.to.filter(id => id !== recipientId)
        }));

        setSelectedRecipients(prev => prev.filter(r => r._id !== recipientId));
    };

    const addRole = (role) => {
        if (composeForm.roles.includes(role)) {
            toast.warning("Este rol ya está agregado");
            return;
        }

        setComposeForm(prev => ({
            ...prev,
            roles: [...prev.roles, role]
        }));

        const roleInfo = availableRoles.find(r => r.value === role);
        setSelectedRoles(prev => [...prev, roleInfo]);
    };

    const removeRole = (role) => {
        setComposeForm(prev => ({
            ...prev,
            roles: prev.roles.filter(r => r !== role)
        }));

        setSelectedRoles(prev => prev.filter(r => r.value !== role));
    };

    const resetComposer = () => {
        setComposing(false);
        setComposeForm({
            to: [],
            roles: [],
            subject: "",
            content: "",
            attachments: [],
            replyTo: null,
            isForward: false
        });
        setSelectedRecipients([]);
        setSelectedRoles([]);
        setRecipientSearch("");
        setRecipientMode("users");
    };

    const handleReply = (message) => {
        setComposing(true);
        setComposeForm({
            to: [message.from._id],
            roles: [],
            subject: message.subject.startsWith("Re: ") ? message.subject : `Re: ${message.subject}`,
            content: `\n\n---\nRespuesta a mensaje de ${message.from.nombre}:\n"${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}"`,
            attachments: [],
            replyTo: message._id,
            isForward: false
        });
        setSelectedRecipients([{
            _id: message.from._id,
            nombre: message.from.nombre,
            email: message.from.email
        }]);
        setRecipientMode("users");
    };

    const handleForward = (message) => {
        setComposing(true);
        setComposeForm({
            to: [],
            roles: [],
            subject: message.subject.startsWith("Fwd: ") ? message.subject : `Fwd: ${message.subject}`,
            content: `\n\n---\nMensaje reenviado de ${message.from.nombre}:\n\n${message.content}`,
            attachments: [], // Los adjuntos originales no se pueden reenviar automáticamente
            replyTo: null,
            isForward: true
        });
        setRecipientMode("users");
    };

    const toggleStar = async (messageId, currentStarred) => {
        try {
            await apiClient.patch(`/internal-messages/${messageId}/starred`);
            setMessages(prev =>
                prev.map(m => m._id === messageId ? { ...m, starred: !currentStarred } : m)
            );
            if (selectedMessage && selectedMessage._id === messageId) {
                setSelectedMessage(prev => ({ ...prev, starred: !currentStarred }));
            }
            toast.success(currentStarred ? "Desmarcado" : "⭐ Marcado como destacado");
        } catch (err) {
            logger.error("Error marcando mensaje:", err);
        }
    };

    const deleteMessage = async (messageId) => {
        if (!window.confirm("¿Eliminar este mensaje?")) return;

        try {
            await apiClient.delete(`/internal-messages/${messageId}`);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            if (selectedMessage && selectedMessage._id === messageId) {
                setSelectedMessage(null);
            }
            toast.success("🗑️ Mensaje eliminado");
        } catch (err) {
            logger.error("Error eliminando mensaje:", err);
            toast.error("Error eliminando mensaje");
        }
    };

    const deleteAllMessages = async () => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar TODOS los mensajes? Esta acción no se puede deshacer.")) return;

        try {
            const res = await apiClient.delete("/internal-messages/");
            setMessages([]);
            setSelectedMessage(null);
            toast.success(`🗑️ ${res.data.deletedCount} mensaje(s) eliminado(s)`);
            loadMessages(); // Recargar para asegurarse
        } catch (err) {
            logger.error("Error eliminando todos los mensajes:", err);
            toast.error("Error eliminando mensajes");
        }
    };

    const downloadAttachment = (messageId, attachmentId, filename) => {
        const url = `${apiClient.defaults.baseURL}/internal-messages/${messageId}/attachments/${attachmentId}`;
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return "Hace un momento";
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        return date.toLocaleDateString("es-AR");
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
                className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📧</span>
                        <h2 className="text-xl font-bold">Mensajería Interna</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setComposing(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                        >
                            ✉️ Nuevo Mensaje
                        </button>
                        <button
                            onClick={deleteAllMessages}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                            title="Eliminar todos los mensajes"
                        >
                            🗑️ Borrar Todo
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 border-r p-4 flex flex-col gap-2">
                        <button
                            onClick={() => setActiveTab("inbox")}
                            className={`px-4 py-2 rounded text-left ${activeTab === "inbox" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                                }`}
                        >
                            📬 Recibidos
                        </button>
                        <button
                            onClick={() => setActiveTab("sent")}
                            className={`px-4 py-2 rounded text-left ${activeTab === "sent" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                                }`}
                        >
                            📤 Enviados
                        </button>
                        <button
                            onClick={() => setActiveTab("starred")}
                            className={`px-4 py-2 rounded text-left ${activeTab === "starred" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                                }`}
                        >
                            ⭐ Destacados
                        </button>
                    </div>

                    {/* Lista de mensajes */}
                    <div className="w-80 border-r overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Cargando...</div>
                        ) : messages.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No hay mensajes
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg._id}
                                    onClick={() => handleSelectMessage(msg)}
                                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${!msg.read && activeTab === "inbox" ? "bg-blue-50" : ""
                                        } ${selectedMessage?._id === msg._id ? "bg-blue-100" : ""}`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <span className={`font-semibold text-sm ${!msg.read ? "font-bold" : ""}`}>
                                            {activeTab === "sent" ? msg.to?.nombre : msg.from?.nombre}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-700 truncate">
                                        {msg.starred && <span className="text-yellow-500">⭐ </span>}
                                        {msg.subject}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate mt-1">
                                        {msg.content.substring(0, 60)}...
                                    </div>
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            📎 {msg.attachments.length} adjunto(s)
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Contenido del mensaje */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedMessage ? (
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold mb-2">{selectedMessage.subject}</h3>
                                        <div className="text-sm text-gray-600">
                                            <p><strong>De:</strong> {selectedMessage.from?.nombre} ({selectedMessage.from?.email})</p>
                                            <p><strong>Para:</strong> {selectedMessage.to?.nombre} ({selectedMessage.to?.email})</p>
                                            <p><strong>Fecha:</strong> {new Date(selectedMessage.createdAt).toLocaleString("es-AR")}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleStar(selectedMessage._id, selectedMessage.starred)}
                                            className="p-2 hover:bg-gray-100 rounded"
                                            title={selectedMessage.starred ? "Desmarcar" : "Destacar"}
                                        >
                                            {selectedMessage.starred ? "⭐" : "☆"}
                                        </button>
                                        <button
                                            onClick={() => deleteMessage(selectedMessage._id)}
                                            className="p-2 hover:bg-gray-100 rounded"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div className="prose max-w-none mb-4">
                                    <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex gap-2 mb-4 pb-4 border-b">
                                    <button
                                        onClick={() => handleReply(selectedMessage)}
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-2"
                                    >
                                        ↩️ Responder
                                    </button>
                                    <button
                                        onClick={() => handleForward(selectedMessage)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
                                    >
                                        ➡️ Reenviar
                                    </button>
                                </div>

                                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded">
                                        <h4 className="font-semibold mb-2">📎 Archivos adjuntos</h4>
                                        {selectedMessage.attachments.map((att) => (
                                            <div key={att._id} className="flex items-center justify-between p-2 bg-white rounded mb-2">
                                                <span className="text-sm">{att.originalName}</span>
                                                <button
                                                    onClick={() => downloadAttachment(selectedMessage._id, att._id, att.originalName)}
                                                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                >
                                                    📥 Descargar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                Selecciona un mensaje para leerlo
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Modal de composición */}
            <AnimatePresence>
                {composing && (
                    <motion.div
                        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-6"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                        >
                            <h3 className="text-xl font-bold mb-4">✉️ Nuevo Mensaje</h3>

                            <form onSubmit={handleSendMessage}>
                                {/* Destinatarios - Tabs */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-2">Para:</label>

                                    {/* Tabs */}
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setRecipientMode("users")}
                                            className={`px-4 py-2 rounded ${recipientMode === "users"
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                }`}
                                        >
                                            👥 Usuarios
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setRecipientMode("roles")}
                                            className={`px-4 py-2 rounded ${recipientMode === "roles"
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                                }`}
                                        >
                                            🏷️ Roles/Grupos
                                        </button>
                                    </div>

                                    {/* Modo: Usuarios */}
                                    {recipientMode === "users" && (
                                        <div>
                                            {/* Chips de usuarios seleccionados */}
                                            {selectedRecipients.length > 0 && (
                                                <div className="mb-2 flex flex-wrap gap-2">
                                                    {selectedRecipients.map((r) => (
                                                        <div
                                                            key={r._id}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                                        >
                                                            <span>{r.nombre}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRecipient(r._id)}
                                                                className="text-blue-700 hover:text-blue-900 font-bold"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <input
                                                type="text"
                                                value={recipientSearch}
                                                onChange={(e) => setRecipientSearch(e.target.value)}
                                                placeholder="Buscar y agregar usuarios..."
                                                className="w-full border rounded px-3 py-2"
                                            />
                                            {recipients.length > 0 && (
                                                <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                                                    {recipients.map((r) => (
                                                        <div
                                                            key={r._id}
                                                            onClick={() => addRecipient(r)}
                                                            className="p-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
                                                        >
                                                            <span>{r.nombre} - {r.email}</span>
                                                            {composeForm.to.includes(r._id) && (
                                                                <span className="text-xs text-green-600">✓ Agregado</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Modo: Roles */}
                                    {recipientMode === "roles" && (
                                        <div>
                                            {/* Chips de roles seleccionados */}
                                            {selectedRoles.length > 0 && (
                                                <div className="mb-3 flex flex-wrap gap-2">
                                                    {selectedRoles.map((r) => (
                                                        <div
                                                            key={r.value}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                                                        >
                                                            <span>{r.icon} {r.label}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeRole(r.value)}
                                                                className="text-purple-700 hover:text-purple-900 font-bold"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <p className="text-sm text-gray-600 mb-2">
                                                Selecciona uno o más roles. El mensaje se enviará a todos los usuarios activos con esos roles.
                                            </p>

                                            <div className="grid grid-cols-2 gap-2">
                                                {availableRoles.map((role) => (
                                                    <button
                                                        key={role.value}
                                                        type="button"
                                                        onClick={() => addRole(role.value)}
                                                        disabled={composeForm.roles.includes(role.value)}
                                                        className={`p-3 rounded border-2 text-left ${composeForm.roles.includes(role.value)
                                                                ? "border-purple-500 bg-purple-50 text-purple-700"
                                                                : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <div className="font-semibold">
                                                            {role.icon} {role.label}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{role.value}</div>
                                                        {composeForm.roles.includes(role.value) && (
                                                            <div className="text-xs text-purple-600 mt-1">✓ Seleccionado</div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Asunto */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-2">Asunto:</label>
                                    <input
                                        type="text"
                                        value={composeForm.subject}
                                        onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                                        className="w-full border rounded px-3 py-2"
                                        placeholder="Asunto del mensaje"
                                    />
                                </div>

                                {/* Contenido */}
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold mb-2">Mensaje:</label>
                                    <textarea
                                        value={composeForm.content}
                                        onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                                        className="w-full border rounded px-3 py-2 h-40"
                                        placeholder="Escribe tu mensaje aquí..."
                                        required
                                    />
                                </div>

                                {/* Adjuntos */}
                                <div className="mb-4">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        📎 Adjuntar archivos
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />
                                    {composeForm.attachments.length > 0 && (
                                        <div className="mt-2">
                                            {composeForm.attachments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-1">
                                                    <span className="text-sm">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Botones */}
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setComposing(false);
                                            setComposeForm({ to: [], roles: [], subject: "", content: "", attachments: [], replyTo: null, isForward: false });
                                            setSelectedRecipients([]);
                                            setSelectedRoles([]);
                                            setRecipientSearch("");
                                        }}
                                        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        📤 Enviar
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
