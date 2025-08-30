// src/components/MetricsPanel.jsx

import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // backend corriendo en ese puerto

export default function MetricsPanel() {
    const [metrics, setMetrics] = useState(null);

    useEffect(() => {
        // Cuando conecte, nos suscribimos a la room "metrics"
        socket.on("connect", () => {
            console.log("🔌 Conectado al backend:", socket.id);
            socket.emit("metrics:subscribe");
        });

        // Escuchar actualizaciones periódicas
        socket.on("metrics:update", (data) => {
            console.log("📊 Metrics recibidas:", data);
            setMetrics(data);
        });

        return () => {
            socket.emit("metrics:unsubscribe");
            socket.off();
        };
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Métricas en tiempo real</h2>
            {metrics ? (
                <pre>{JSON.stringify(metrics, null, 2)}</pre>
            ) : (
                <p>Esperando datos...</p>
            )}
        </div>
    );
}