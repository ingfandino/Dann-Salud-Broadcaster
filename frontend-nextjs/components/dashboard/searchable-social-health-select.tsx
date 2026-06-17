"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SocialHealthOption } from "@/hooks/useSocialHealthList"

export function normalizeSocialHealthSearch(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function filterSocialHealthOptions(options: SocialHealthOption[], search: string) {
  const term = normalizeSocialHealthSearch(search)
  if (!term) return options

  const digits = term.replace(/\D/g, "")
  if (digits && digits.length === term.length) {
    return options.filter((option) => {
      const code = String(option.code || "")
      const codePadded = String(option.codePadded || option.code || "").padStart(6, "0")
      return code === digits ||
        code.startsWith(digits) ||
        codePadded === digits ||
        codePadded.startsWith(digits) ||
        codePadded.includes(digits)
    })
  }

  return options.filter((option) =>
    normalizeSocialHealthSearch(option.name).includes(term)
  )
}

interface SearchableSocialHealthSelectProps {
  value: string
  onChange: (value: string) => void
  options: SocialHealthOption[]
  disabled?: boolean
  placeholder?: string
  className?: string
  theme?: string
}

export function SearchableSocialHealthSelect({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Obra social anterior",
  className,
  theme,
}: SearchableSocialHealthSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => {
    if (!value) return null
    return options.find((option) => option.value.toLowerCase() === value.trim().toLowerCase()) || null
  }, [options, value])

  const filtered = useMemo(
    () => filterSocialHealthOptions(options, search).slice(0, 80),
    [options, search]
  )

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [])

  const displayValue = open ? search : (selected ? `${selected.codePadded} - ${selected.name}` : value)

  return (
    <div ref={rootRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={displayValue}
        onFocus={() => !disabled && setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value)
          setOpen(true)
        }}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border py-2 pl-9 pr-9 text-sm",
          disabled && "cursor-not-allowed opacity-60",
          theme === "dark"
            ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
            : "bg-white border-gray-200 text-gray-800 placeholder-gray-400",
          className
        )}
      />
      {value && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange("")
            setSearch("")
            setOpen(false)
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-700"
          aria-label="Limpiar obra social anterior"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {open && !disabled && (
        <div
          className={cn(
            "absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border shadow-lg",
            theme === "dark"
              ? "border-white/10 bg-[#1a1333] text-white"
              : "border-gray-200 bg-white text-gray-800"
          )}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
          ) : filtered.map((option) => (
            <button
              key={`${option.code}-${option.name}`}
              type="button"
              onClick={() => {
                onChange(option.value)
                setSearch("")
                setOpen(false)
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50",
                theme === "dark" && "hover:bg-white/10",
                option.value === value && (theme === "dark" ? "bg-white/10" : "bg-emerald-50")
              )}
            >
              <span className="font-medium">{option.codePadded}</span>
              <span className="mx-2 text-gray-400">-</span>
              <span>{option.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
