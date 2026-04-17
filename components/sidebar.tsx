"use client"

import { BookOpen, LayoutDashboard, Users, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SidebarProps {
  currentView: "dashboard" | "words-book" | "revisions"
  onViewChange: (view: "dashboard" | "words-book" | "revisions") => void
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-xl text-foreground">Daily Words</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Seções</p>
          <Button
            variant={currentView === "dashboard" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("dashboard")}
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Dashboard
          </Button>
          <Button
            variant={currentView === "words-book" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("words-book")}
          >
            <BookOpen className="w-4 h-4 mr-3" />
            Words Book
          </Button>
          <Button
            variant={currentView === "revisions" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("revisions")}
          >
            <Flame className="w-4 h-4 mr-3" />
            Revisões
          </Button>
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full mb-4 bg-transparent">
          <Users className="w-4 h-4 mr-2" />
          Convidar Amigos
        </Button>
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/images/image.png" />
            <AvatarFallback className="bg-primary text-primary-foreground">GA</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Gabriella</p>
            <p className="text-xs text-muted-foreground truncate">@gabriella</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
