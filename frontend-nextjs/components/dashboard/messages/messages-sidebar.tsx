"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Inbox, Send, Star, PenSquare } from "lucide-react"
import { useTheme } from "../theme-provider"

interface MessagesSidebarProps {
    currentView: 'inbox' | 'sent' | 'starred'
    onViewChange: (view: 'inbox' | 'sent' | 'starred') => void
    onCompose: () => void
    unreadCount: number
}

export function MessagesSidebar({ currentView, onViewChange, onCompose, unreadCount }: MessagesSidebarProps) {
    const { theme } = useTheme()

    return (
        <div className={cn(
            "w-64 flex-shrink-0 border-r p-4 flex flex-col gap-4 hidden md:flex",
            theme === "dark" ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50/50"
        )}>
            <Button
                onClick={onCompose}
                className={cn(
                    "w-full gap-2 text-white",
                    theme === "dark"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : "bg-[#00C794] hover:bg-[#00a87d]"
                )}
            >
                <PenSquare className="w-4 h-4" />
                Redactar
            </Button>

            <nav className="space-y-1">
                <button
                    onClick={() => onViewChange('inbox')}
                    className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        currentView === 'inbox'
                            ? theme === "dark" ? "bg-white/10 text-white" : "bg-[#00C794]/10 text-[#00C794]"
                            : theme === "dark" ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <Inbox className="w-4 h-4" />
                        Bandeja de entrada
                    </div>
                    {unreadCount > 0 && (
                        <span className={cn(
                            "text-white text-xs px-2 py-0.5 rounded-full",
                            theme === "dark" ? "bg-purple-600" : "bg-[#00C794]"
                        )}>
                            {unreadCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => onViewChange('sent')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        currentView === 'sent'
                            ? theme === "dark" ? "bg-white/10 text-white" : "bg-[#00C794]/10 text-[#00C794]"
                            : theme === "dark" ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                >
                    <Send className="w-4 h-4" />
                    Enviados
                </button>

                <button
                    onClick={() => onViewChange('starred')}
                    className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        currentView === 'starred'
                            ? theme === "dark" ? "bg-white/10 text-white" : "bg-[#00C794]/10 text-[#00C794]"
                            : theme === "dark" ? "text-gray-400 hover:bg-white/5 hover:text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                >
                    <Star className="w-4 h-4" />
                    Destacados
                </button>
            </nav>
        </div>
    )
}
