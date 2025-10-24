// frontend/src/components/RoleRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ roles = [], children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <p>Cargando...</p>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const allowedRoles = roles.map((r) => (r || "").toLowerCase());
    const currentRole = (user.role || "").toLowerCase();

    if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
        return <Navigate to="/" replace />;
    }

    return children;
}
