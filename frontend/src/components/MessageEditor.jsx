// src/components/MessageEditor.jsx

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

export default function MessageEditor({ onChange, onPreview }) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [content, setContent] = useState("");
    const [headers, setHeaders] = useState([]);
    const textareaRef = useRef();

    // 🔹 Cargar headers dinámicos desde backend
    useEffect(() => {
        axios.get("/contacts/headers")
            .then(res => setHeaders(res.data.headers || []))
            .catch(err => {
                console.error("❌ Error cargando headers:", err);
                setHeaders([]);
            });
    }, []);

    const insertAtCursor = (text) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
            content.substring(0, start) + text + content.substring(end);
        setContent(newValue);
        if (onChange) onChange(newValue);

        // Mover cursor al final del texto insertado
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
            textarea.focus();
        }, 0);
    };

    const applyFormat = (format) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = content.substring(start, end);

        let formatted = selected;
        if (format === "bold") formatted = `*${selected}*`;
        if (format === "italic") formatted = `_${selected}_`;

        const newValue =
            content.substring(0, start) + formatted + content.substring(end);
        setContent(newValue);
        if (onChange) onChange(newValue);

        setTimeout(() => {
            textarea.selectionStart = start;
            textarea.selectionEnd = start + formatted.length;
            textarea.focus();
        }, 0);
    };

    return (
        <div className="p-4 border rounded-lg shadow-md w-full max-w-lg">
            {/* Botones de formato */}
            <div className="flex flex-wrap gap-2 mb-2">
                <button className="px-2 py-1 bg-gray-200 rounded font-bold" onClick={() => applyFormat("bold")}>B</button>
                <button className="px-2 py-1 bg-gray-200 rounded italic" onClick={() => applyFormat("italic")}>I</button>
                <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>

                {/* Botones dinámicos de headers */}
                {headers.length > 0 ? (
                    headers.map((h) => (
                        <button
                            key={h}
                            onClick={() => insertAtCursor(`${h}`)}
                            className="px-2 py-1 bg-blue-200 rounded text-sm"
                        >
                            {`{{${h}}}`}
                        </button>
                    ))
                ) : (
                    <span className="text-gray-500 text-sm ml-2">Sin headers importados</span>
                )}
            </div>

            {/* Textarea */}
            <textarea
                ref={textareaRef}
                className="w-full h-32 border rounded p-2"
                value={content}
                placeholder="Escribe tu mensaje aquí..."
                onChange={(e) => {
                    setContent(e.target.value);
                    if (onChange) onChange(e.target.value);
                }}
            />

            {/* Emoji picker */}
            {showEmojiPicker && (
                <div className="mt-2">
                    <Picker
                        data={data}
                        onEmojiSelect={(emoji) => insertAtCursor(emoji.native)}
                    />
                </div>
            )}

            {/* Vista previa */}
            {onPreview && (
                <button
                    onClick={() => onPreview(content)}
                    className="mt-3 px-4 py-2 bg-green-500 text-white rounded"
                >
                    Vista previa
                </button>
            )}
        </div>
    );
}