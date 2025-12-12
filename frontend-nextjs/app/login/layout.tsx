import { ThemeProvider } from '@/components/dashboard/theme-provider';
import { Toaster } from '@/components/ui/sonner';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider>
            {children}
            <Toaster />
        </ThemeProvider>
    );
}
