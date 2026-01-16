/**
 * ============================================================
 * LAYOUT DEL DASHBOARD (app/dashboard/layout.tsx)
 * ============================================================
 * Estructura principal del panel de control.
 * Incluye sidebar, header móvil, tema y notificaciones.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MobileHeader } from '@/components/dashboard/mobile-header';
import { ThemeProvider } from '@/components/dashboard/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { connectSocket } from '@/lib/socket';

/** Layout principal del dashboard con navegación */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('reportes-globales');

    const pathname = usePathname();

    /* Mapeo de sección a ruta */
    const routeMap: Record<string, string> = {
        'reportes-globales': '/dashboard/reports',
        'mensajeria-masiva': '/dashboard/send',
        'mensajeria-interna': '/dashboard/messages',
        'base-afiliados-estadistica': '/dashboard/affiliates/stats',
        'base-afiliados-exitosas': '/dashboard/affiliates/success',
        'base-afiliados-exportaciones': '/dashboard/affiliates/exports',
        'base-afiliados-configuracion': '/dashboard/affiliates/config',
        'base-afiliados-lista': '/dashboard/affiliates/list',
        'base-afiliados-cargar': '/dashboard/affiliates/upload',
        'base-afiliados-frescos': '/dashboard/affiliates/fresh',
        'base-afiliados-reutilizables': '/dashboard/affiliates/reusable',
        'base-afiliados-fallidas': '/dashboard/affiliates/failed',
        'contactar-afiliados': '/dashboard/contact/admin',
        'contactar-afiliados-administracion': '/dashboard/contact/admin',
        'contactar-afiliados-datos-dia': '/dashboard/contact/today',
        'palabras-prohibidas-lista': '/dashboard/banned-words',
        'palabras-prohibidas-detecciones': '/dashboard/banned-words/detections',
        'palabras-prohibidas-agregar': '/dashboard/banned-words/add',
        'auditorias-seguimiento': '/dashboard/audits/follow-up',
        'auditorias-crear-turno': '/dashboard/audits/create',
        'auditorias-liquidacion': '/dashboard/audits/liquidation',
        'auditorias-falta-clave': '/dashboard/audits/falta-clave',
        'auditorias-rechazada': '/dashboard/audits/rechazada',
        'auditorias-pendiente': '/dashboard/audits/pendiente',
        'auditorias-afip-padron': '/dashboard/audits/afip-padron',
        'rrhh-estadisticas': '/dashboard/hr/stats',
        'rrhh-activos': '/dashboard/hr/active',
        'rrhh-inactivos': '/dashboard/hr/inactive',
        'rrhh-agregar': '/dashboard/hr/add',
        'rrhh-telefonos': '/dashboard/hr/phones',
        'administracion-registro-ventas': '/dashboard/admin/sales-record',
        'gestion-usuarios': '/dashboard/users',
    };

    /* Sincronizar activeSection con pathname */
    useEffect(() => {
        const entry = Object.entries(routeMap).find(([_, route]) => route === pathname);
        if (entry) {
            setActiveSection(entry[0]);
        }
    }, [pathname]);

    const handleSectionChange = (section: string) => {
        console.log("Layout: handleSectionChange called with section:", section);
        setActiveSection(section);
        setIsMobileOpen(false);

        const route = routeMap[section];
        console.log("Layout: mapped route:", route);
        if (route) {
            router.push(route);
        } else {
            console.warn("Layout: No route found for section:", section);
        }
    };

    /* Inicializar conexión socket para todas las páginas del dashboard */
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                connectSocket();
            }
        }
    }, []);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <ThemeProvider>
            <div className="flex min-h-screen bg-background">
                <Sidebar
                    activeSection={activeSection}
                    onSectionChange={handleSectionChange}
                    isMobileOpen={isMobileOpen}
                    onClose={() => setIsMobileOpen(false)}
                    onLogout={handleLogout}
                />

                <div className="flex-1 flex flex-col">
                    <MobileHeader
                        isSidebarOpen={isMobileOpen}
                        onToggleSidebar={() => setIsMobileOpen(!isMobileOpen)}
                    />
                    <main className="flex-1 p-4 pt-20 lg:pt-8 lg:p-8 overflow-auto">
                        {children}
                    </main>
                </div>
            </div>
            <Toaster />
        </ThemeProvider>
    );
}
