// frontend/src/components/PrivateRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children }) {
    const { token, loading } = useAuth();

    if (loading) return <div>Cargando...</div>;
    return token ? children : <Navigate to="/login" replace />;
}