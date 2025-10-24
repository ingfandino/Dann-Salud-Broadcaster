// frontend/src/components/AdminRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <p>Cargando...</p>;
    }

    if (!user) {
        // Si no hay usuario → redirige al login
        return <Navigate to="/login" replace />;
    }

    const role = (user.role || '').toLowerCase();
    if (!(role === "admin" || role === "gerencia")) {
        // Si está logueado pero no es admin → lo mandamos al dashboard
        return <Navigate to="/" replace />;
    }

    // ✅ Usuario admin → renderizamos el contenido protegido
    return children;
}