// frontend/src/components/GerenciaRoute.jsx

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function GerenciaRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Cargando...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = (user.role || "").toLowerCase();
  if (role !== "gerencia") {
    return <Navigate to="/" replace />;
  }

  return children;
}
