/**
 * AUDITORÍAS - FALTA CLAVE
 * Ventas con estado "Falta clave", ordenadas por más antiguas primero
 */
"use client"

import { AuditoriasRecuperacionBase } from "./auditorias-recuperacion-base"

export function AuditoriasFaltaClave() {
  return <AuditoriasRecuperacionBase type="falta-clave" />
}
