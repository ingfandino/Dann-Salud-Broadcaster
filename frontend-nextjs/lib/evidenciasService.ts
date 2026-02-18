/**
 * ============================================================
 * SERVICIO DE EVIDENCIAS
 * ============================================================
 * Funciones para interactuar con el backend del módulo de evidencias.
 * NO duplica lógica de negocio - solo consume endpoints.
 */

import apiClient from './api';

export interface Evidencia {
  _id: string;
  ventaId: {
    _id: string;
    nombre: string;
    cuil: string;
    telefono: string;
    obraSocialVendida: string;
    status: string;
  };
  estado: 'incompleta' | 'en_proceso' | 'terminada';
  filePath: string | null;
  originalName: string | null;
  fileSizeKB: number | null;
  uploadedBy: {
    _id: string;
    nombre: string;
    email: string;
  } | null;
  uploadedAt: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VentaElegible {
  _id: string;
  nombre: string;
  cuil: string;
  telefono: string;
  obraSocialVendida: string;
  status: string;
  fechaCreacionQR: string | null;
  createdAt: string;
  scheduledAt: string;
}

export interface EvidenciasParams {
  estado?: 'incompleta' | 'en_proceso' | 'terminada';
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

/**
 * Obtiene listado de evidencias con filtros opcionales
 */
export async function getEvidencias(params?: EvidenciasParams): Promise<{
  ok: boolean;
  evidencias: Evidencia[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const response = await apiClient.get('/evidencias', { params });
  return response.data;
}

/**
 * Obtiene una evidencia específica por ventaId
 */
export async function getEvidenciaByVenta(ventaId: string): Promise<{
  ok: boolean;
  evidencia: Evidencia | null;
}> {
  const response = await apiClient.get(`/evidencias/${ventaId}`);
  return response.data;
}

export interface VentasElegiblesParams {
  page?: number;
  limit?: number;
  nombre?: string;
  cuil?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

/**
 * Obtiene ventas elegibles para tener evidencia (paginado)
 */
export async function getVentasElegibles(params?: VentasElegiblesParams): Promise<{
  ok: boolean;
  ventas: VentaElegible[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}> {
  const response = await apiClient.get('/evidencias/ventas-elegibles', { params });
  return response.data;
}

/**
 * Sube o reemplaza un archivo ZIP de evidencia
 * @param ventaId - ID de la venta
 * @param file - Archivo ZIP a subir
 */
export async function uploadZip(ventaId: string, file: File): Promise<{
  ok: boolean;
  message: string;
  evidencia: Evidencia;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('ventaId', ventaId);

  const response = await apiClient.post('/evidencias/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

/**
 * Marca una evidencia como "terminada"
 * Solo permitido cuando venta.status === "QR hecho"
 */
export async function markAsComplete(ventaId: string): Promise<{
  ok: boolean;
  message: string;
  evidencia: Evidencia;
}> {
  const response = await apiClient.patch(`/evidencias/${ventaId}/complete`);
  return response.data;
}

/**
 * Descarga el archivo ZIP de una evidencia
 * @param ventaId - ID de la venta
 * @param originalName - Nombre original del archivo (para guardar)
 */
export async function downloadZip(ventaId: string, originalName: string): Promise<void> {
  const response = await apiClient.get(`/evidencias/${ventaId}/download`, {
    responseType: 'blob',
  });

  // Crear blob y descargar
  const blob = new Blob([response.data], { type: 'application/zip' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = originalName || 'evidencia.zip';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
