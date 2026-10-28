"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  BookOpen,
  LayoutDashboard,
  RotateCcw,
  User,
  LogOut,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getUserProfile } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { Pill } from "@/components/shared"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"

type NavItem = { label: string; href: string; icon: LucideIcon; count?: number }

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signout } = useAuth()
  const [role, setRole] = useState("user")

  useEffect(() => {
    async function fetchRole() {
      if (user) {
        try {
          const profile = await getUserProfile()
          setRole(profile.role || "user")
        } catch (error) {
          setRole("user")
        }
      }
    }
    fetchRole()
  }, [user])

  const handleLogout = async () => {
    try {
      await signout()
    } catch (error: any) {
      toast.error("Erro ao sair")
    }
  }

  const userInitial = user?.email?.[0]?.toUpperCase() || "U"
  const userDisplayName = user?.full_name || user?.username || user?.email?.split("@")[0] || "Usuário"
  const userInitials =
    userDisplayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || userInitial

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Meu Caderninho", href: "/words", icon: BookOpen },
    { label: "Revisões", href: "/revisions", icon: RotateCcw },
  ]

  if (role === "admin") {
    navItems.push({ label: "Admin Review", href: "/admin/feedback", icon: ShieldCheck })
  }

  return (
    <aside className="flex h-full w-60 lg:w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-lg font-bold text-primary">Daily Words</p>
            <p className="truncate text-xs text-muted-foreground">Inglês descomplicado</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {typeof item.count === "number" && (
                    <Pill variant="solid" size="sm" className="min-w-5 justify-center">
                      {item.count}
                    </Pill>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div className="shrink-0 space-y-3 border-t border-sidebar-border p-3 pb-5">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5 transition-colors hover:bg-muted"
        >
          <Avatar className="size-9">
            <AvatarImage src={user?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary-soft text-xs font-bold text-primary-soft-foreground">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">{userDisplayName}</p>
              {role === "admin" && (
                <Pill size="sm" className="shrink-0">admin</Pill>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground" title={user?.email ?? undefined}>
              {user?.email}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-destructive/30 px-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive-soft"
          >
            <LogOut className="size-4" />
            Sair
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
