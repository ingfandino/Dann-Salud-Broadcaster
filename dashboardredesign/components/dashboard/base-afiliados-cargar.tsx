"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

export function BaseAfiliadosCargar() {
  const { theme } = useTheme()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      setFile(droppedFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  return (
    <div className="animate-fade-in-up space-y-4">
      {/* Header */}
      <div
        className={cn(
          "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
          theme === "dark"
            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
        )}
      >
        <h2
          className={cn(
            "text-lg lg:text-xl font-semibold flex items-center gap-2 mb-4",
            theme === "dark" ? "text-white" : "text-gray-700",
          )}
        >
          <Upload className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
          Cargar Archivo de Afiliados
        </h2>

        {/* Requisitos */}
        <div
          className={cn(
            "rounded-xl p-4 space-y-2",
            theme === "dark" ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50 border border-blue-200",
          )}
        >
          <h3
            className={cn(
              "font-semibold text-sm flex items-center gap-2",
              theme === "dark" ? "text-blue-300" : "text-blue-700",
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Requisitos del archivo:
          </h3>
          <ul className={cn("text-sm space-y-1 ml-6", theme === "dark" ? "text-blue-200" : "text-blue-600")}>
            <li>
              <strong>Formato:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>.xlsx</span> o{" "}
              <span className={cn(theme === "dark" ? "text-cyan-400" : "text-cyan-600")}>.xls</span>
            </li>
            <li>
              <strong>Campos obligatorios:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-purple-400" : "text-purple-600")}>
                Nombre, CUIL, Obra Social, Localidad, Teléfono_1
              </span>
            </li>
            <li>
              <strong>Campos opcionales:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Teléfono_2, Teléfono_3, Edad, Código de obra social
              </span>
            </li>
            <li>
              <strong>Tolerancia de headers:</strong>{" "}
              <span className={cn(theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                Acepta variantes (ej: "nombre", "Name", "NOMBRE")
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 lg:p-12 text-center cursor-pointer transition-all duration-300",
          isDragging
            ? theme === "dark"
              ? "border-purple-500 bg-purple-500/10"
              : "border-purple-400 bg-purple-50"
            : theme === "dark"
              ? "border-white/20 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/5"
              : "border-gray-300 bg-white hover:border-purple-300 hover:bg-purple-50/50",
        )}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />

        {file ? (
          <div className="space-y-3">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-xl flex items-center justify-center",
                theme === "dark" ? "bg-green-500/20" : "bg-green-100",
              )}
            >
              <CheckCircle className={cn("w-8 h-8", theme === "dark" ? "text-green-400" : "text-green-500")} />
            </div>
            <div>
              <p className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>{file.name}</p>
              <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              className={cn(
                "px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105",
                theme === "dark"
                  ? "bg-gradient-to-r from-green-600 to-green-500 text-white"
                  : "bg-gradient-to-r from-green-500 to-green-400 text-white",
              )}
            >
              Procesar Archivo
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={cn(
                "w-16 h-16 mx-auto rounded-xl flex items-center justify-center",
                theme === "dark" ? "bg-white/10" : "bg-gray-100",
              )}
            >
              <FileSpreadsheet className={cn("w-8 h-8", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
            </div>
            <div>
              <p className={cn("font-semibold", theme === "dark" ? "text-white" : "text-gray-700")}>
                Click aquí para seleccionar archivo
              </p>
              <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                O arrastra y suelta tu archivo .xlsx
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
