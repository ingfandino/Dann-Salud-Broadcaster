/**
 * ============================================================
 * LAYOUT RAÍZ (app/layout.tsx)
 * ============================================================
 * Layout principal de la aplicación Next.js.
 * Configura fuentes, metadatos SEO e íconos adaptativos.
 */

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

/* ========== FUENTE PRINCIPAL ========== */
// Nota: Se usa inter de next/font/google, pero si falla el fetch (sin internet),
// el build de Next.js/Turbopack puede fallar. 
const inter = { className: "font-sans" }; // Fallback simple para evitar error de fetch
// const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "DANN+SALUD Online",
  description: "Sistema de gestión empresarial",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
