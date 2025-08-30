// src/App.jsx

import React, { useState } from "react";
import axios from "axios";
import MessageEditor from "./components/MessageEditor";

// 🔹 Parser básico estilo WhatsApp
function parseWhatsAppFormat(text) {
    if (!text) return "";

    let parsed = text;

    // Negrita: *texto*
    parsed = parsed.replace(/\*(.*?)\*/g, "<strong>$1</strong>");

    // Cursiva: _texto_
    parsed = parsed.replace(/_(.*?)_/g, "<em>$1</em>");

    // Saltos de línea
    parsed = parsed.replace(/\n/g, "<br/>");

    return parsed;
}

export default function App() {
    const [message, setMessage] = useState("");
    const [preview, setPreview] = useState("");

    // 🔹 Enviar contenido a backend para vista previa
    const handlePreview = async (content) => {
        try {
            // ⚠️ En producción, aquí deberías traer el primer contacto real de la importación.
            // Para la prueba usamos un contacto mock.
            const mockContact = {
                nombre: "Juan",
                telefono: "123456789",
                cuil: "20-12345678-9",
            };
            if (!content || content.trim() === "") {
                setPreview("⚠️ Escribe un mensaje primero");
                return;
            }
            const res = await axios.post("http://localhost:5000/messages/preview", {
                template: content,
                contact: mockContact,
            });


            setPreview(res.data.rendered);
        } catch (err) {
            console.error("❌ Error generando vista previa:", err);
            setPreview("Error al generar vista previa");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">✍️ Editor de Mensajes</h1>

            <MessageEditor
                onChange={setMessage}
                onPreview={handlePreview}
            />

            <h2 className="mt-4 font-semibold">Vista previa generada:</h2>
            <div
                className="p-3 border rounded bg-gray-50 whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: parseWhatsAppFormat(preview) }}
            />
        </div>
    );
}