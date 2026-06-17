"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { RefreshCw, Play, CheckCircle2, FileDown, Upload } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface DocumentProcessingCase {
  _id: string
  administrativeStatus: string
  isLocked: boolean
  updatedAt: string
  auditId?: {
    nombre?: string
    cuil?: string
    obraSocialVendida?: string
    status?: string
  }
  obraSocialId?: {
    displayName?: string
    cardColor?: string
  }
  obraSocialReview?: {
    status?: string
  }
  qrData?: {
    status?: string
  }
}

const statusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  aprobado_para_obra_social: "Aprobado para obra social",
  correccion_solicitada: "Corrección solicitada",
  rechazado: "Rechazado",
  qr_hecho: "QR hecho",
}

export function ProcesamientoDocumental() {
  const [cases, setCases] = useState<DocumentProcessingCase[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadCases = async () => {
    setLoading(true)
    try {
      const response = await api.documentProcessingCases.list()
      setCases(response.data || [])
    } catch (error) {
      toast.error("No se pudo cargar la bandeja documental")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const runAction = async (id: string, action: () => Promise<unknown>, successMessage: string) => {
    setBusyId(id)
    try {
      await action()
      toast.success(successMessage)
      await loadCases()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "No se pudo completar la acción")
    } finally {
      setBusyId(null)
    }
  }

  const uploadQr = async (documentCase: DocumentProcessingCase, file?: File) => {
    if (!file) return
    const formData = new FormData()
    formData.append("qrPdf", file)
    await runAction(documentCase._id, () => api.documentProcessingCases.uploadQr(documentCase._id, formData), "QR final cargado")
  }

  const downloadQr = async (documentCase: DocumentProcessingCase) => {
    setBusyId(documentCase._id)
    try {
      const response = await api.documentProcessingCases.downloadQr(documentCase._id)
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }))
      const link = document.createElement("a")
      link.href = url
      link.download = `qr-${documentCase._id}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "QR final no disponible")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Procesamiento documental</CardTitle>
        <Button variant="outline" size="sm" onClick={loadCases} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
          Actualizar
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Afiliado</TableHead>
              <TableHead>Obra social</TableHead>
              <TableHead>Estado administrativo</TableHead>
              <TableHead>Revisión obra social</TableHead>
              <TableHead>QR</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((documentCase) => (
              <TableRow key={documentCase._id}>
                <TableCell>
                  <div className="font-medium">{documentCase.auditId?.nombre || "Sin nombre"}</div>
                  <div className="text-xs text-muted-foreground">{documentCase.auditId?.cuil || "Sin CUIL"}</div>
                </TableCell>
                <TableCell>{documentCase.obraSocialId?.displayName || documentCase.auditId?.obraSocialVendida || "-"}</TableCell>
                <TableCell>
                  <Badge variant={documentCase.isLocked ? "secondary" : "outline"}>{statusLabel[documentCase.administrativeStatus] || documentCase.administrativeStatus}</Badge>
                </TableCell>
                <TableCell>{documentCase.obraSocialReview?.status || "pendiente"}</TableCell>
                <TableCell>{documentCase.qrData?.status || "pending"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.isLocked} onClick={() => runAction(documentCase._id, () => api.documentProcessingCases.process(documentCase._id), "Procesamiento ejecutado")}>
                      <Play />
                      Procesar
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.isLocked} onClick={() => runAction(documentCase._id, () => api.documentProcessingCases.approveForObraSocial(documentCase._id), "Caso aprobado para obra social")}>
                      <CheckCircle2 />
                      Aprobar
                    </Button>
                    <label className="inline-flex">
                      <input className="hidden" type="file" accept="application/pdf" disabled={busyId === documentCase._id || documentCase.isLocked} onChange={(event) => uploadQr(documentCase, event.target.files?.[0])} />
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer">
                        <Upload className="size-4" />
                        QR
                      </span>
                    </label>
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.qrData?.status !== "generated"} onClick={() => downloadQr(documentCase)}>
                      <FileDown />
                      Descargar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!cases.length && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay casos documentales para mostrar.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
