// frontend/src/components/InternalMessageButton.jsx

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../services/api";
import InternalMessages from "../pages/InternalMessages";
import { useAuth } from "../context/AuthContext";
import logger from "../utils/logger";

export default function InternalMessageButton() {
    const { user } = useAuth();
    const [showMessages, setShowMessages] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
            
            // Actualizar cada 30 segundos
            const interval = setInterval(fetchUnreadCount, 30000);
            
            // Escuchar eventos de Socket.io para actualizar en tiempo real
            const socket = window.socket;
            if (socket) {
                socket.on("new_message", () => {
                    fetchUnreadCount();
                });
                socket.on("message_read", () => {
                    fetchUnreadCount();
                });
            }
            
            return () => {
                clearInterval(interval);
                if (socket) {
                    socket.off("new_message");
                    socket.off("message_read");
                }
            };
        }
    }, [user]);

    const fetchUnreadCount = async () => {
        try {
            const res = await apiClient.get("/internal-messages/unread-count");
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            logger.error("Error obteniendo contador de no leídos:", err);
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Botón flotante */}
            <motion.button
                onClick={() => setShowMessages(true)}
                className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 z-40 flex items-center justify-center"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Mensajería Interna"
            >
                <span className="text-2xl">📧</span>
                {unreadCount > 0 && (
                    <motion.span
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        key={unreadCount}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </motion.span>
                )}
            </motion.button>

            {/* Modal de mensajes */}
            <AnimatePresence>
                {showMessages && (
                    <InternalMessages 
                        onClose={() => {
                            setShowMessages(false);
                            fetchUnreadCount(); // Actualizar al cerrar
                        }} 
                    />
                )}
            </AnimatePresence>
        </>
    );
}
