"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  FileArchive, 
  Download, 
  CheckCircle, 
  Upload, 
  Lock, 
  Search,
  Filter,
  X
} from "lucide-react";
import {
  getEvidencias,
  uploadZip,
  markAsComplete,
  downloadZip,
  type Evidencia,
  type EvidenciasParams
} from "@/lib/evidenciasService";

export default function EvidenciasPage() {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [filters, setFilters] = useState<EvidenciasParams>({
    estado: undefined,
    search: "",
    fechaDesde: undefined,
    fechaHasta: undefined,
    page: 1,
    limit: 20
  });

  // Modales
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedVentaId, setSelectedVentaId] = useState<string | null>(null);
  const [confirmCompleteModal, setConfirmCompleteModal] = useState(false);
  const [evidenciaToComplete, setEvidenciaToComplete] = useState<Evidencia | null>(null);

  // Cargar evidencias
  const loadEvidencias = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        search: filters.search || undefined,
        estado: filters.estado || undefined,
        page
      };
      const response = await getEvidencias(params);
      setEvidencias(response.evidencias);
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al cargar evidencias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvidencias();
  }, [page, filters.estado]);

  const handleSearch = () => {
    setPage(1);
    loadEvidencias();
  };

  const handleClearFilters = () => {
    setFilters({
      estado: undefined,
      search: "",
      fechaDesde: undefined,
      fechaHasta: undefined,
      page: 1,
      limit: 20
    });
    setPage(1);
  };

  const handleDownload = async (evidencia: Evidencia) => {
    try {
      await downloadZip(evidencia.ventaId._id, evidencia.originalName || "evidencia.zip");
      toast.success("Descarga iniciada");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al descargar archivo");
    }
  };

  const handleOpenCompleteModal = (evidencia: Evidencia) => {
    setEvidenciaToComplete(evidencia);
    setConfirmCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    if (!evidenciaToComplete) return;

    try {
      const response = await markAsComplete(evidenciaToComplete.ventaId._id);
      toast.success(response.message);
      setConfirmCompleteModal(false);
      setEvidenciaToComplete(null);
      loadEvidencias();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al marcar como terminada");
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      incompleta: "bg-gray-100 text-gray-700",
      en_proceso: "bg-blue-100 text-blue-700",
      terminada: "bg-green-100 text-green-700"
    };
    const labels = {
      incompleta: "Incompleta",
      en_proceso: "En Proceso",
      terminada: "Terminada"
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[estado as keyof typeof badges]}`}>
        {labels[estado as keyof typeof labels]}
      </span>
    );
  };

  const canUpload = (evidencia: Evidencia) => {
    return !evidencia.isLocked;
  };

  const canMarkComplete = (evidencia: Evidencia) => {
    return evidencia.ventaId.status === "QR hecho" && evidencia.estado !== "terminada";
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FileArchive className="text-blue-600" size={32} />
          Gestión de Evidencias
        </h1>
        <p className="text-gray-600 mt-1">
          Administra archivos ZIP de evidencias vinculados a ventas
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre o CUIL..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Estado */}
          <select
            value={filters.estado || ""}
            onChange={(e) => setFilters({ ...filters, estado: e.target.value as any || undefined })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="incompleta">Incompleta</option>
            <option value="en_proceso">En Proceso</option>
            <option value="terminada">Terminada</option>
          </select>

          {/* Botones */}
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Filter size={18} />
            Aplicar
          </button>

          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
          >
            <X size={18} />
            Limpiar
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Cargando evidencias...
          </div>
        ) : evidencias.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron evidencias
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Afiliado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">CUIL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Estado Venta</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Estado Evidencia</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Archivo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Bloqueo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {evidencias.map((evidencia) => (
                  <tr key={evidencia._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{evidencia.ventaId.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{evidencia.ventaId.cuil}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {evidencia.ventaId.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{getEstadoBadge(evidencia.estado)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {evidencia.originalName ? (
                        <span className="flex items-center gap-1">
                          <FileArchive size={14} />
                          {evidencia.originalName}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin archivo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {evidencia.isLocked ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <Lock size={14} />
                          Bloqueada
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        {/* Botón Upload */}
                        <button
                          onClick={() => {
                            setSelectedVentaId(evidencia.ventaId._id);
                            setUploadModalOpen(true);
                          }}
                          disabled={!canUpload(evidencia)}
                          title={
                            !canUpload(evidencia)
                              ? "No se puede modificar la evidencia porque la venta está en 'QR hecho'."
                              : "Subir/Reemplazar ZIP"
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            canUpload(evidencia)
                              ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <Upload size={16} />
                        </button>

                        {/* Botón Marcar Terminada */}
                        <button
                          onClick={() => handleOpenCompleteModal(evidencia)}
                          disabled={!canMarkComplete(evidencia)}
                          title={
                            !canMarkComplete(evidencia)
                              ? "Solo disponible cuando la venta esté en 'QR hecho'."
                              : "Marcar como Terminada"
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            canMarkComplete(evidencia)
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <CheckCircle size={16} />
                        </button>

                        {/* Botón Descargar */}
                        <button
                          onClick={() => handleDownload(evidencia)}
                          disabled={!evidencia.filePath}
                          title={evidencia.filePath ? "Descargar ZIP" : "Sin archivo disponible"}
                          className={`p-2 rounded-lg transition-colors ${
                            evidencia.filePath
                              ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando {evidencias.length} de {total} evidencias
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Upload */}
      {uploadModalOpen && (
        <UploadModal
          ventaId={selectedVentaId!}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedVentaId(null);
          }}
          onSuccess={() => {
            setUploadModalOpen(false);
            setSelectedVentaId(null);
            loadEvidencias();
          }}
        />
      )}

      {/* Modal Confirmar Terminada */}
      {confirmCompleteModal && evidenciaToComplete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirmar Acción</h3>
            <p className="text-gray-600 mb-6">
              ¿Confirmas que deseas marcar esta evidencia como <strong>Terminada</strong>? 
              Esta acción no permitirá futuras modificaciones mientras la venta esté en 'QR hecho'.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setConfirmCompleteModal(false);
                  setEvidenciaToComplete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Modal de Upload
function UploadModal({ 
  ventaId, 
  onClose, 
  onSuccess 
}: { 
  ventaId: string; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validación extensión
    if (!selectedFile.name.toLowerCase().endsWith('.zip')) {
      toast.error("Solo se permiten archivos .zip");
      return;
    }

    // Validación tamaño (100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB en bytes
    if (selectedFile.size > maxSize) {
      toast.error("El archivo no debe superar los 100MB");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    try {
      setUploading(true);
      setProgress(50); // Simulación de progreso
      const response = await uploadZip(ventaId, file);
      setProgress(100);
      toast.success(response.message);
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Error al subir archivo");
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Upload size={20} />
          Subir Archivo ZIP
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar archivo
          </label>
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={uploading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato: .zip | Tamaño máximo: 100MB
          </p>
        </div>

        {file && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Archivo seleccionado:</strong> {file.name}
            </p>
            <p className="text-xs text-gray-500">
              Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {uploading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              Subiendo... {progress}%
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </div>
    </div>
  );
}
