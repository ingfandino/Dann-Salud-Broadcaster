"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CheckCircle2, FileDown, RefreshCw, RotateCcw, XCircle } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ObraSocialCase {
  _id: string
  administrativeStatus: string
  updatedAt: string
  auditId?: {
    nombre?: string
    cuil?: string
    obraSocialVendida?: string
    status?: string
  }
  obraSocialReview?: {
    status?: string
    reason?: string
  }
  qrData?: {
    status?: string
  }
}

const statusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  aprobado_para_obra_social: "En revisión",
  correccion_solicitada: "Corrección solicitada",
  rechazado: "Rechazado",
  qr_hecho: "QR hecho",
}

export function ObrasSociales() {
  const [cases, setCases] = useState<ObraSocialCase[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadCases = async () => {
    setLoading(true)
    try {
      const response = await api.documentProcessingObraSocial.listCases()
      setCases(response.data || [])
    } catch (error) {
      toast.error("No se pudieron cargar los casos de obra social")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const review = async (id: string, action: string, successMessage: string) => {
    setBusyId(id)
    try {
      await api.documentProcessingObraSocial.review(id, { action })
      toast.success(successMessage)
      await loadCases()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "No se pudo completar la revisión")
    } finally {
      setBusyId(null)
    }
  }

  const downloadQr = async (documentCase: ObraSocialCase) => {
    setBusyId(documentCase._id)
    try {
      const response = await api.documentProcessingObraSocial.downloadQr(documentCase._id)
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
        <CardTitle>Obras Sociales</CardTitle>
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
              <TableHead>Estado</TableHead>
              <TableHead>Revisión</TableHead>
              <TableHead>QR final</TableHead>
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
                <TableCell>
                  <Badge variant="outline">{statusLabel[documentCase.administrativeStatus] || documentCase.administrativeStatus}</Badge>
                </TableCell>
                <TableCell>{documentCase.obraSocialReview?.status || "pendiente"}</TableCell>
                <TableCell>{documentCase.qrData?.status === "generated" ? "Disponible" : "Pendiente"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.administrativeStatus !== "aprobado_para_obra_social"} onClick={() => review(documentCase._id, "approve_for_qr", "Caso aprobado para QR")}>
                      <CheckCircle2 />
                      Aprobar QR
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.administrativeStatus !== "aprobado_para_obra_social"} onClick={() => review(documentCase._id, "request_correction", "Corrección solicitada")}>
                      <RotateCcw />
                      Corrección
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.administrativeStatus !== "aprobado_para_obra_social"} onClick={() => review(documentCase._id, "reject", "Caso rechazado")}>
                      <XCircle />
                      Rechazar
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === documentCase._id || documentCase.qrData?.status !== "generated"} onClick={() => downloadQr(documentCase)}>
                      <FileDown />
                      QR
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!cases.length && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No hay casos disponibles para esta obra social.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
