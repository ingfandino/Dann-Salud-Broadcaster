// frontend/src/components/MessageEditor.jsx

import React from "react";

export default function MessageEditor({ onChange, onPreview }) {
    const [text, setText] = React.useState("");

    const handleChange = (e) => {
        setText(e.target.value);
        if (onChange) onChange(e.target.value);
    };

    const handlePreview = () => {
        if (onPreview) onPreview(text);
    };

    return (
        <div className="bg-white p-4 rounded shadow">
            <textarea
                className="w-full h-40 border p-2 rounded"
                placeholder="Escribe tu mensaje aquí. *negrita*, _cursiva_, {a|b} spintax..."
                value={text}
                onChange={handleChange}
            />
            <div className="flex gap-2 mt-3">
                <button onClick={handlePreview} className="bg-blue-600 text-white px-4 py-2 rounded">
                    Vista previa
                </button>
                <button onClick={() => { setText(""); onChange && onChange(""); }} className="px-4 py-2 border rounded">
                    Limpiar
                </button>
            </div>
        </div>
    );
}
