/**
 * ============================================================
 * PÁGINA PRINCIPAL DEL DASHBOARD (app/dashboard/page.tsx)
 * ============================================================
 * Vista por defecto del dashboard (Reportes Globales).
 */

'use client';

import { DashboardContent } from '@/components/dashboard/dashboard-content';

/** Página principal del dashboard */
export default function DashboardPage() {
    return <DashboardContent activeSection="reportes-globales" />;
}
