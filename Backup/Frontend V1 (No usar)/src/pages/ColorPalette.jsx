// frontend/src/pages/ColorPalette.jsx
// Página de demostración de la nueva paleta de colores

import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Palette } from "lucide-react";

export default function ColorPalette() {
    const navigate = useNavigate();

    const colors = {
        blue: [
            { name: "blue-50", hex: "#E6F7FB" },
            { name: "blue-100", hex: "#CCEFF7" },
            { name: "blue-200", hex: "#99DFEF" },
            { name: "blue-300", hex: "#66CFE7" },
            { name: "blue-400", hex: "#33BFDF" },
            { name: "blue-500", hex: "#009FC2", label: "✨ Azul Brillante" },
            { name: "blue-600", hex: "#0078A0", label: "⭐ Azul Océano" },
            { name: "blue-700", hex: "#00608B" },
            { name: "blue-800", hex: "#004876" },
            { name: "blue-900", hex: "#003061" },
        ],
        purple: [
            { name: "purple-50", hex: "#F9F0FE" },
            { name: "purple-100", hex: "#F3E1FD" },
            { name: "purple-200", hex: "#E7C3FB" },
            { name: "purple-300", hex: "#DBA5F9" },
            { name: "purple-400", hex: "#CF87F7" },
            { name: "purple-500", hex: "#C76CF5", label: "✨ Violeta Claro" },
            { name: "purple-600", hex: "#B556E3" },
            { name: "purple-700", hex: "#A340D1" },
            { name: "purple-800", hex: "#8C2AAF" },
            { name: "purple-900", hex: "#75148D" },
        ],
        pink: [
            { name: "pink-50", hex: "#FDF0F8" },
            { name: "pink-100", hex: "#FBE1F1" },
            { name: "pink-200", hex: "#F7C3E3" },
            { name: "pink-300", hex: "#F3A5D5" },
            { name: "pink-400", hex: "#EF87C7" },
            { name: "pink-500", hex: "#E13BEA", label: "✨ Fucsia Suave" },
            { name: "pink-600", hex: "#D325D7" },
            { name: "pink-700", hex: "#C50FC4" },
            { name: "pink-800", hex: "#A70FA6" },
            { name: "pink-900", hex: "#890F88" },
        ],
        gray: [
            { name: "gray-50", hex: "#F8FAFB" },
            { name: "gray-100", hex: "#E8EDEF" },
            { name: "gray-200", hex: "#D1DBE0" },
            { name: "gray-300", hex: "#B0BFC7" },
            { name: "gray-400", hex: "#8FA3AE" },
            { name: "gray-500", hex: "#6E8795" },
            { name: "gray-600", hex: "#556A77" },
            { name: "gray-700", hex: "#3C4D59" },
            { name: "gray-800", hex: "#23303B" },
            { name: "gray-900", hex: "#081E33", label: "⭐ Fondo Oscuro" },
        ],
    };

    const gradients = [
        { name: "gradient-1", label: "Azul Brillante → Violeta", class: "bg-gradient-1" },
        { name: "gradient-2", label: "Azul Océano → Azul Brillante", class: "bg-gradient-2" },
        { name: "gradient-3", label: "Fucsia → Violeta", class: "bg-gradient-3" },
        { name: "gradient-4", label: "Azul Brillante → Fucsia", class: "bg-gradient-4" },
        { name: "gradient-dark", label: "Fondo Oscuro → Azul Océano", class: "bg-gradient-dark" },
    ];

    return (
        <motion.div
            className="p-6 max-w-7xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Palette className="w-10 h-10 text-blue-600" />
                    <div>
                        <h1 className="text-4xl font-bold">Nueva Paleta de Colores</h1>
                        <p className="text-gray-600 mt-1">
                            Dann+Salud Online - Identidad Visual 2.0
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    ← Volver
                </button>
            </div>

            {/* Colores Corporativos Principales */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">🎨 Colores Corporativos</h2>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="w-full h-32 rounded-lg shadow-lg" style={{ backgroundColor: "#009FC2" }}></div>
                        <p className="font-semibold mt-2">Azul Brillante</p>
                        <p className="text-sm text-gray-600">#009FC2</p>
                        <p className="text-xs text-gray-500 mt-1">Principal</p>
                    </div>
                    <div className="text-center">
                        <div className="w-full h-32 rounded-lg shadow-lg" style={{ backgroundColor: "#0078A0" }}></div>
                        <p className="font-semibold mt-2">Azul Océano</p>
                        <p className="text-sm text-gray-600">#0078A0</p>
                        <p className="text-xs text-gray-500 mt-1">Secundario</p>
                    </div>
                    <div className="text-center">
                        <div className="w-full h-32 rounded-lg shadow-lg" style={{ backgroundColor: "#C76CF5" }}></div>
                        <p className="font-semibold mt-2">Violeta Claro</p>
                        <p className="text-sm text-gray-600">#C76CF5</p>
                        <p className="text-xs text-gray-500 mt-1">Acentos</p>
                    </div>
                    <div className="text-center">
                        <div className="w-full h-32 rounded-lg shadow-lg" style={{ backgroundColor: "#E13BEA" }}></div>
                        <p className="font-semibold mt-2">Fucsia Suave</p>
                        <p className="text-sm text-gray-600">#E13BEA</p>
                        <p className="text-xs text-gray-500 mt-1">Alertas</p>
                    </div>
                    <div className="text-center">
                        <div className="w-full h-32 rounded-lg shadow-lg" style={{ backgroundColor: "#081E33" }}></div>
                        <p className="font-semibold mt-2 text-white">Fondo Oscuro</p>
                        <p className="text-sm text-gray-300">#081E33</p>
                        <p className="text-xs text-gray-400 mt-1">Dark Mode</p>
                    </div>
                </div>
            </div>

            {/* Escalas de Color */}
            {Object.entries(colors).map(([colorName, shades]) => (
                <div key={colorName} className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-4 capitalize">{colorName}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
                        {shades.map((shade) => (
                            <div key={shade.name} className="text-center">
                                <div
                                    className={`w-full h-24 rounded-lg shadow ${shade.name}`}
                                    style={{ backgroundColor: shade.hex }}
                                ></div>
                                <p className="text-xs font-semibold mt-2">{shade.name}</p>
                                <p className="text-xs text-gray-600">{shade.hex}</p>
                                {shade.label && (
                                    <p className="text-xs font-bold text-blue-600 mt-1">{shade.label}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Gradientes */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">🌈 Gradientes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gradients.map((gradient) => (
                        <div key={gradient.name} className="text-center">
                            <div className={`w-full h-32 rounded-lg shadow-lg ${gradient.class}`}></div>
                            <p className="font-semibold mt-2">{gradient.name}</p>
                            <p className="text-sm text-gray-600">{gradient.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ejemplos de Componentes */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">🧩 Ejemplos de Uso</h2>

                {/* Botones */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-3">Botones</h3>
                    <div className="flex flex-wrap gap-3">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            Principal (Azul Océano)
                        </button>
                        <button className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition">
                            Secundario (Violeta)
                        </button>
                        <button className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition">
                            Alerta (Fucsia)
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                            Neutral
                        </button>
                    </div>
                </div>

                {/* Badges */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-3">Badges</h3>
                    <div className="flex flex-wrap gap-3">
                        <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-semibold">
                            Azul Brillante
                        </span>
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                            Azul Océano
                        </span>
                        <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-semibold">
                            Violeta
                        </span>
                        <span className="px-3 py-1 bg-pink-500 text-white rounded-full text-sm font-semibold">
                            Fucsia
                        </span>
                    </div>
                </div>

                {/* Cards con Gradientes */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-3">Cards con Gradientes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-1 p-6 rounded-lg text-white shadow-lg">
                            <h4 className="text-xl font-bold mb-2">Azul → Violeta</h4>
                            <p>Card con gradiente de azul brillante a violeta claro</p>
                        </div>
                        <div className="bg-gradient-dark p-6 rounded-lg text-white shadow-lg">
                            <h4 className="text-xl font-bold mb-2">Oscuro → Océano</h4>
                            <p>Card con gradiente de fondo oscuro a azul océano</p>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-3">Alertas</h3>
                    <div className="space-y-3">
                        <div className="bg-blue-100 border-l-4 border-blue-600 p-4 rounded">
                            <p className="text-blue-800 font-semibold">ℹ️ Información importante</p>
                        </div>
                        <div className="bg-purple-100 border-l-4 border-purple-600 p-4 rounded">
                            <p className="text-purple-800 font-semibold">✨ Novedad destacada</p>
                        </div>
                        <div className="bg-pink-100 border-l-4 border-pink-600 p-4 rounded">
                            <p className="text-pink-800 font-semibold">⚠️ Atención requerida</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Documentación */}
            <div className="bg-gradient-1 rounded-lg shadow-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-4">📚 Documentación</h2>
                <p className="mb-4">
                    Para más información sobre cómo usar la nueva paleta de colores, consulta:
                </p>
                <ul className="list-disc list-inside space-y-2">
                    <li>
                        <strong>NUEVA_PALETA_DE_COLORES.md</strong> - Documentación completa
                    </li>
                    <li>
                        <strong>PALETA_COLORES_GUIA_RAPIDA.md</strong> - Referencia rápida
                    </li>
                    <li>
                        <strong>tailwind.config.cjs</strong> - Configuración técnica
                    </li>
                </ul>
            </div>
        </motion.div>
    );
}
