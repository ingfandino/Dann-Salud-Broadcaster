/**
 * ============================================================
 * FORMAS FLOTANTES (floating-shapes.tsx)
 * ============================================================
 * Elementos decorativos animados para páginas de auth.
 * Genera figuras geométricas con movimiento aleatorio.
 */

"use client"

import { useEffect, useState } from "react"

interface Shape {
  id: number
  type: "circle" | "square" | "triangle" | "ring"
  x: number
  y: number
  size: number
  color: string
  delay: number
  duration: number
  opacity: number
}

interface FloatingShapesProps {
  theme: "light" | "dark"
}

export function FloatingShapes({ theme }: FloatingShapesProps) {
  const [shapes, setShapes] = useState<Shape[]>([])

  useEffect(() => {
    const colors = ["#17C787", "#1E88E5", "#C62FA8", "#0E6FFF", "#F4C04A", "#C8376B"]
    const types: Shape["type"][] = ["circle", "square", "triangle", "ring"]

    const newShapes: Shape[] = []
    for (let i = 0; i < 15; i++) {
      newShapes.push({
        id: i,
        type: types[Math.floor(Math.random() * types.length)],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 40 + 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 5,
        duration: Math.random() * 10 + 15,
        opacity: theme === "dark" ? Math.random() * 0.15 + 0.05 : Math.random() * 0.1 + 0.03,
      })
    }
    setShapes(newShapes)
  }, [theme])

  const renderShape = (shape: Shape) => {
    const baseStyle = {
      left: `${shape.x}%`,
      top: `${shape.y}%`,
      width: shape.size,
      height: shape.size,
      opacity: shape.opacity,
      animationDelay: `${shape.delay}s`,
      animationDuration: `${shape.duration}s`,
    }

    switch (shape.type) {
      case "circle":
        return (
          <div
            key={shape.id}
            className="absolute rounded-full animate-float-rotate"
            style={{
              ...baseStyle,
              backgroundColor: shape.color,
              filter: "blur(1px)",
            }}
          />
        )
      case "square":
        return (
          <div
            key={shape.id}
            className="absolute rounded-lg animate-float-spin"
            style={{
              ...baseStyle,
              backgroundColor: shape.color,
              filter: "blur(1px)",
            }}
          />
        )
      case "triangle":
        return (
          <div
            key={shape.id}
            className="absolute animate-float-rotate"
            style={{
              ...baseStyle,
              width: 0,
              height: 0,
              borderLeft: `${shape.size / 2}px solid transparent`,
              borderRight: `${shape.size / 2}px solid transparent`,
              borderBottom: `${shape.size}px solid ${shape.color}`,
              filter: "blur(1px)",
            }}
          />
        )
      case "ring":
        return (
          <div
            key={shape.id}
            className="absolute rounded-full animate-float-pulse border-2"
            style={{
              ...baseStyle,
              borderColor: shape.color,
              backgroundColor: "transparent",
            }}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {shapes.map(renderShape)}
    </div>
  )
}
