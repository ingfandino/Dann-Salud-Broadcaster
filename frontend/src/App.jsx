// frontend/src/App.jsx

import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Páginas
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import QRLink from "./pages/QrLink";
import AdminUsers from "./pages/AdminUsers";
import Reports from "./pages/Reports";
import BulkMessages from "./pages/BulkMessages";
import JobDetail from "./pages/JobDetail";
import Audits from "./pages/Audits";

// Contexto y rutas protegidas
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import GerenciaRoute from "./components/GerenciaRoute";
import RoleRoute from "./components/RoleRoute";
import MetricsPanel from "./components/MetricsPanel";

export default function App() {
    const [showDiagnostics, setShowDiagnostics] = useState(false);
    return (
        <AuthProvider>
            <Routes>
                {/* Público */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* /qr-link is defined below as a PrivateRoute to avoid duplicate mounts */}

                {/* Protegido */}
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    }
                />

                <Route
                    path="/reports"
                    element={
                        <RoleRoute roles={["gerencia", "revendedor"]}>
                            <Reports />
                        </RoleRoute>
                    }
                />

                <Route
                    path="/bulk-messages"
                    element={
                        <PrivateRoute>
                            <BulkMessages />
                        </PrivateRoute>
                    }
                />

                <Route
                    path="/jobs/:id"
                    element={
                        <PrivateRoute>
                            <JobDetail />
                        </PrivateRoute>
                    }
                />

                <Route
                    path="/qr-link"
                    element={
                        <PrivateRoute>
                            <QRLink />
                        </PrivateRoute>
                    }
                />

                {/* Solo gerencia */}
                <Route
                    path="/admin/users"
                    element={
                        <GerenciaRoute>
                            <AdminUsers />
                        </GerenciaRoute>
                    }
                />

                <Route
                    path="/audits"
                    element={
                        <PrivateRoute>
                            <Audits />
                        </PrivateRoute>
                    }
                />
            </Routes>

            {/* Notificaciones globales */}
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />

            {/* Botón flotante para abrir Estado/Diagnóstico */}
            <button
                aria-label="Abrir panel de estado"
                onClick={() => setShowDiagnostics((v) => !v)}
                className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 flex items-center justify-center"
                title="Estado del sistema"
            >
                ⚙️
            </button>

            {/* Panel deslizable simple */}
            {showDiagnostics && (
                <div className="fixed inset-0 z-40 flex">
                    <div
                        className="flex-1 bg-black/30"
                        onClick={() => setShowDiagnostics(false)}
                        aria-label="Cerrar panel"
                    />
                    <div className="w-full sm:w-[420px] max-w-[90%] h-full bg-white shadow-2xl overflow-auto">
                        <div className="flex items-center justify-between p-3 border-b">
                            <h3 className="font-semibold">Estado del sistema</h3>
                            <button
                                className="text-gray-600 hover:text-gray-900"
                                onClick={() => setShowDiagnostics(false)}
                                aria-label="Cerrar"
                            >
                                ✖
                            </button>
                        </div>
                        <MetricsPanel />
                    </div>
                </div>
            )}
        </AuthProvider>
    );
}