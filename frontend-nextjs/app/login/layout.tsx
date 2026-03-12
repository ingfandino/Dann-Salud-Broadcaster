/**
 * ============================================================
 * LAYOUT DE LOGIN (app/login/layout.tsx)
 * ============================================================
 * Layout para páginas de autenticación.
 * Provee tema y notificaciones toast.
 */

import { ThemeProvider } from '@/components/dashboard/theme-provider';
import { Toaster } from '@/components/ui/sonner';

/** Layout de páginas de autenticación */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            {children}
            <Toaster />
        </ThemeProvider>
    );
}
