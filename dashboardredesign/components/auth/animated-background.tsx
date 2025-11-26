"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  pulse: number
  pulseSpeed: number
}

interface AnimatedBackgroundProps {
  theme: "light" | "dark"
}

export function AnimatedBackground({ theme }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Platform colors
    const colors =
      theme === "dark"
        ? ["#17C787", "#1E88E5", "#C62FA8", "#0E6FFF", "#F4C04A", "#C8376B"]
        : ["#17C787", "#1E88E5", "#C62FA8", "#0E6FFF", "#F4C04A", "#C8376B"]

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = []
      const count = Math.min(50, Math.floor((canvas.width * canvas.height) / 25000))

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: Math.random() * 0.5 + 0.1,
          pulse: 0,
          pulseSpeed: Math.random() * 0.02 + 0.01,
        })
      }
      particlesRef.current = particles
    }

    initParticles()

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener("mousemove", handleMouseMove)

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw gradient orbs
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.2,
        canvas.height * 0.3,
        0,
        canvas.width * 0.2,
        canvas.height * 0.3,
        300,
      )
      gradient1.addColorStop(0, theme === "dark" ? "rgba(139, 92, 246, 0.15)" : "rgba(139, 92, 246, 0.08)")
      gradient1.addColorStop(1, "transparent")
      ctx.fillStyle = gradient1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.8,
        canvas.height * 0.7,
        0,
        canvas.width * 0.8,
        canvas.height * 0.7,
        350,
      )
      gradient2.addColorStop(0, theme === "dark" ? "rgba(30, 136, 229, 0.12)" : "rgba(30, 136, 229, 0.06)")
      gradient2.addColorStop(1, "transparent")
      ctx.fillStyle = gradient2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current.forEach((particle, i) => {
        // Update pulse
        particle.pulse += particle.pulseSpeed
        const pulseFactor = Math.sin(particle.pulse) * 0.3 + 1

        // Mouse interaction
        const dx = mouseRef.current.x - particle.x
        const dy = mouseRef.current.y - particle.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 150) {
          const force = (150 - dist) / 150
          particle.vx -= (dx / dist) * force * 0.02
          particle.vy -= (dy / dist) * force * 0.02
        }

        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Apply friction
        particle.vx *= 0.99
        particle.vy *= 0.99

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        // Keep in bounds
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))

        // Draw particle with glow
        ctx.save()
        ctx.globalAlpha = particle.alpha * pulseFactor

        // Glow effect
        const glow = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 4 * pulseFactor,
        )
        glow.addColorStop(0, particle.color)
        glow.addColorStop(1, "transparent")
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 4 * pulseFactor, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.globalAlpha = particle.alpha * 2
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * pulseFactor, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Draw connections
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const other = particlesRef.current[j]
          const distance = Math.sqrt(Math.pow(particle.x - other.x, 2) + Math.pow(particle.y - other.y, 2))

          if (distance < 120) {
            ctx.save()
            ctx.globalAlpha = (1 - distance / 120) * 0.15
            ctx.strokeStyle = particle.color
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
            ctx.restore()
          }
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [theme])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />
}
