// frontend/src/components/MessagePreview.jsx

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import apiClient from "../services/api";
import logger from "../utils/logger";

export default function MessagePreview({ message, contacts }) {
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const generatePreview = async () => {
        if (!message || !contacts || contacts.length === 0) {
            return;
        }
        setLoading(true);
        try {
            const firstContact = contacts[0];
            const res = await apiClient.post("/messages/preview", {
                message,
                contact: firstContact,
            });
            setPreview(res.data.preview);
        } catch (err) {
            logger.error("Error generando vista previa:", err);
            setPreview("❌ Error generando vista previa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mt-4">
            <CardContent>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">Vista previa</h2>
                    <Button onClick={generatePreview} disabled={loading || !message || !contacts?.length}>
                        {loading ? "Generando..." : "Generar vista previa"}
                    </Button>
                </div>

                {preview && (
                    <div className="p-3 bg-gray-100 rounded-md text-sm whitespace-pre-wrap">
                        {preview}
                    </div>
                )}
                {!preview && <p className="text-sm text-gray-500">No generada aún</p>}
            </CardContent>
        </Card>
    );
}