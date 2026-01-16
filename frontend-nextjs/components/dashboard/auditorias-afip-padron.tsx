/**
 * AUDITORÍAS - AFIP Y PADRÓN
 * Ventas con estado "AFIP" o "Padrón" con flag disponibleParaVenta activo
 */
"use client"

import { AuditoriasRecuperacionBase } from "./auditorias-recuperacion-base"

export function AuditoriasAfipPadron() {
  return <AuditoriasRecuperacionBase type="afip-padron" />
}
