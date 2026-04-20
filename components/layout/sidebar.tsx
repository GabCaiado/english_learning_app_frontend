"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { BookOpen, LayoutDashboard, Users, Flame, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      toast.success("Até logo!")
      router.push("/login")
      router.refresh()
    } catch (error: any) {
      toast.error("Erro ao sair")
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() || "U"
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Words Book", href: "/words", icon: BookOpen },
    { label: "Revisões", href: "/revisions", icon: Flame },
  ]

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      {/* Logo & Brand */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-xl text-foreground">Daily Words</h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">Seções</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Link>
              </Button>
            )
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border space-y-4">
        <Button variant="outline" className="w-full bg-transparent">
          <Users className="w-4 h-4 mr-2" />
          Convidar Amigos
        </Button>

        <div className="flex items-center gap-3 p-2 rounded-lg bg-accent/50 border border-border/50">
          <Avatar className="w-10 h-10 border-2 border-primary/20">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold italic">{userInitial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{userDisplayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sair da Conta
        </Button>
      </div>
    </aside>
  )
}
