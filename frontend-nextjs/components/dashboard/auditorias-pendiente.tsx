/**
 * AUDITORÍAS - PENDIENTE
 * Ventas con estado "Pendiente" o "Falta documentación"
 */
"use client"

import { AuditoriasRecuperacionBase } from "./auditorias-recuperacion-base"

export function AuditoriasPendiente() {
  return <AuditoriasRecuperacionBase type="pendiente" />
}
