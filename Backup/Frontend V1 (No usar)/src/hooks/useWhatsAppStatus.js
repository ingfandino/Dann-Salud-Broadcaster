// frontend/src/hooks/useWhatsAppStatus.jsx

import { useEffect, useState } from "react";
import apiClient from "../services/api";

export default function useWhatsAppStatus() {
    const [connected, setConnected] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await apiClient.get("/whatsapp/status");
                setConnected(res.data.connected);
            } catch (err) {
                console.error("Error verificando estado de WhatsApp:", err);
                setConnected(false);
            }
        };

        fetchStatus();
    }, []);

    return connected;
}