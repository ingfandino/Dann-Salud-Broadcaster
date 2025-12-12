"use client"

import { useState } from "react"
import { X, Plus, Trash2, Sparkles } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface SpintaxModalProps {
    isOpen: boolean
    onClose: () => void
    onInsert: (spintax: string) => void
}

export function SpintaxModal({ isOpen, onClose, onInsert }: SpintaxModalProps) {
    const { theme } = useTheme()
    const [options, setOptions] = useState<string[]>(["", ""])

    if (!isOpen) return null

    const handleAddOption = () => {
        setOptions([...options, ""])
    }

    const handleRemoveOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index))
        }
    }

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    const handleInsert = () => {
        const validOptions = options.filter(opt => opt.trim() !== "")
        if (validOptions.length < 2) {
            alert("Debes ingresar al menos 2 opciones")
            return
        }
        const spintax = `{${validOptions.join("|")}}`
        onInsert(spintax)
        setOptions(["", ""])
        onClose()
    }

    const handleClose = () => {
        setOptions(["", ""])
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className={cn(
                    "w-full max-w-lg rounded-2xl border p-6 shadow-2xl animate-scale-in",
                    theme === "dark"
                        ? "bg-gradient-to-br from-gray-900 to-gray-800 border-white/10"
                        : "bg-white border-purple-200"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div
                            className={cn(
                                "p-2 rounded-lg",
                                theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
                            )}
                        >
                            <Sparkles className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-600")} />
                        </div>
                        <h3 className={cn("text-lg font-bold", theme === "dark" ? "text-white" : "text-gray-800")}>
                            Crear Spintax
                        </h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-600"
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Explanation */}
                <div
                    className={cn(
                        "mb-4 p-3 rounded-lg text-sm",
                        theme === "dark" ? "bg-blue-500/10 text-blue-300 border border-blue-500/20" : "bg-blue-50 text-blue-700 border border-blue-200"
                    )}
                >
                    <p className="font-medium mb-1">¿Qué es Spintax?</p>
                    <p className="text-xs opacity-90">
                        Spintax permite crear variaciones de texto. El sistema elegirá aleatoriamente una de las opciones que ingreses,
                        haciendo cada mensaje único y evitando que parezcan automáticos.
                    </p>
                </div>

                {/* Options */}
                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                    {options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="flex-1">
                                <label
                                    className={cn(
                                        "block text-xs font-medium mb-1",
                                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                                    )}
                                >
                                    Opción {index + 1}
                                </label>
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Ejemplo: "${index === 0 ? "Hola" : index === 1 ? "Buenos días" : "Saludos"}"`}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg text-sm border transition-all focus:ring-2",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-purple-500/20"
                                            : "bg-white border-purple-200/50 text-gray-700 placeholder-gray-400 focus:border-purple-400 focus:ring-purple-200/50"
                                    )}
                                />
                            </div>
                            {options.length > 2 && (
                                <button
                                    onClick={() => handleRemoveOption(index)}
                                    className={cn(
                                        "mt-6 p-2 rounded-lg transition-colors",
                                        theme === "dark" ? "hover:bg-red-500/20 text-red-400" : "hover:bg-red-100 text-red-600"
                                    )}
                                    title="Eliminar opción"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Option Button */}
                <button
                    onClick={handleAddOption}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all mb-4",
                        theme === "dark"
                            ? "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                    )}
                >
                    <Plus className="w-4 h-4" />
                    Agregar opción
                </button>

                {/* Preview */}
                {options.filter(opt => opt.trim() !== "").length >= 2 && (
                    <div
                        className={cn(
                            "mb-4 p-3 rounded-lg text-sm",
                            theme === "dark" ? "bg-green-500/10 border border-green-500/20" : "bg-green-50 border border-green-200"
                        )}
                    >
                        <p className={cn("font-medium mb-1", theme === "dark" ? "text-green-300" : "text-green-700")}>
                            Vista previa:
                        </p>
                        <code className={cn("text-xs", theme === "dark" ? "text-green-200" : "text-green-600")}>
                            {`{${options.filter(opt => opt.trim() !== "").join("|")}}`}
                        </code>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleClose}
                        className={cn(
                            "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                            theme === "dark"
                                ? "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                        )}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleInsert}
                        className={cn(
                            "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                            theme === "dark"
                                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-500/20"
                                : "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-200/50"
                        )}
                    >
                        Insertar Spintax
                    </button>
                </div>
            </div>
        </div>
    )
}
