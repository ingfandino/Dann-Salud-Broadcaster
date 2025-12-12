// frontend/src/pages/Audits.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import AuditPanel from "../components/AuditPanel";
import { motion } from "framer-motion";

export default function Audits() {
    const navigate = useNavigate();

    return (
        <motion.div
            className="p-6 w-full overflow-x-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center justify-between mb-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold">📋 Gestión de Auditorías</h1>
                    <p className="text-sm text-gray-600">Ingreso y supervisión de auditorías</p>
                </motion.div>

                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
                    >
                        ← Volver al Menú
                    </button>
                </motion.div>
            </div>
            <AuditPanel />
        </motion.div>

    );
}