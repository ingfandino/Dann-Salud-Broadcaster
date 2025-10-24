// frontend/src/components/PrivateRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
    const { token, loading } = useAuth();
    const storedToken = (() => {
        try {
            const t = localStorage.getItem("token");
            return t && t !== "null" && t !== "undefined" ? t : null;
        } catch { return null; }
    })();

    if (loading) return <div>Cargando...</div>;
    return (token || storedToken) ? children : <Navigate to="/login" replace />;
}