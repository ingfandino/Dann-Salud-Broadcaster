/**
 * ============================================================
 * ANIMACIÓN DE CELEBRACIÓN (celebration-animation.tsx)
 * ============================================================
 * Animación de confetti para estados exitosos.
 * Se muestra al completar una auditoría o hacer QR.
 */

"use client"

import { useEffect, useState, useMemo } from "react"
import { createPortal } from "react-dom"

interface CelebrationAnimationProps {
    isActive: boolean
    onComplete?: () => void
    duration?: number /* en ms, default 3500 */
}
export function CelebrationAnimation({ 
    isActive, 
    onComplete,
    duration = 3500 
}: CelebrationAnimationProps) {
    const [mounted, setMounted] = useState(false)
    const [visible, setVisible] = useState(false)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    useEffect(() => {
        console.log("[CelebrationAnimation] isActive cambió a:", isActive)
        if (isActive) {
            console.log("[CelebrationAnimation] 🎉 Iniciando animación de celebración!")
            setVisible(true)
            setFadeOut(false)
            
            // Iniciar fade out antes de cerrar
            const fadeTimer = setTimeout(() => {
                setFadeOut(true)
            }, duration - 500)
            
            const timer = setTimeout(() => {
                console.log("[CelebrationAnimation] Finalizando animación")
                setVisible(false)
                onComplete?.()
            }, duration)
            
            return () => {
                clearTimeout(timer)
                clearTimeout(fadeTimer)
            }
        }
    }, [isActive, duration, onComplete])

    // Generar confetti una sola vez
    const confettiPieces = useMemo(() => 
        Array.from({ length: 60 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.8,
            color: [
                '#10B981', '#34D399', '#6EE7B7', '#FFD700', 
                '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6'
            ][Math.floor(Math.random() * 8)],
            size: 8 + Math.random() * 8,
            duration: 2.5 + Math.random() * 1.5
        }))
    , [])

    if (!mounted || !visible) return null

    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] pointer-events-none overflow-hidden"
            style={{
                opacity: fadeOut ? 0 : 1,
                transition: 'opacity 0.5s ease-out'
            }}
        >
            {/* Piezas de confeti cayendo */}
            {confettiPieces.map((piece) => (
                <div
                    key={piece.id}
                    style={{
                        position: 'absolute',
                        left: `${piece.left}%`,
                        top: '-20px',
                        width: `${piece.size}px`,
                        height: `${piece.size}px`,
                        backgroundColor: piece.color,
                        borderRadius: '2px',
                        animation: `confettiFall ${piece.duration}s ease-out ${piece.delay}s forwards`,
                    }}
                />
            ))}

            {/* Mensaje de felicitación central */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div 
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-12 py-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4"
                    style={{
                        animation: 'celebrationPop 0.5s ease-out forwards, celebrationPulse 1s ease-in-out infinite 0.5s',
                        boxShadow: '0 25px 60px -12px rgba(16, 185, 129, 0.5)'
                    }}
                >
                    <div 
                        className="text-7xl"
                        style={{ animation: 'bounce 0.6s ease-in-out infinite' }}
                    >
                        🎉
                    </div>
                    <div className="text-3xl font-bold tracking-wide">¡EXCELENTE!</div>
                    <div className="text-emerald-100 text-lg">Venta completada exitosamente</div>
                </div>
            </div>

            {/* Emojis flotantes decorativos */}
            {['⭐', '✨', '🌟', '💫', '🎊', '🥳'].map((emoji, i) => (
                <div 
                    key={i}
                    className="absolute text-4xl"
                    style={{
                        left: `${15 + i * 15}%`,
                        top: `${20 + (i % 3) * 25}%`,
                        animation: `starFloat 2s ease-in-out ${i * 0.15}s infinite`,
                    }}
                >
                    {emoji}
                </div>
            ))}

            {/* Animaciones CSS */}
            <style>{`
                @keyframes confettiFall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                @keyframes celebrationPop {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes celebrationPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.03); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes starFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.8; }
                    50% { transform: translateY(-20px) rotate(180deg) scale(1.3); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    )
}
