"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { login as apiLogin, logout as apiLogout, getMe, UserProfile, refreshTokens, authFetch } from "@/lib/auth"

const PUBLIC_PATHS = ['/login', '/reset-password', '/forgot-password', '/verify-email', '/signup']

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  signin: (email: string, password: string) => Promise<void>
  signout: () => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname?.startsWith(p))

    const init = async () => {
      const res = await authFetch('/auth/me', { skipCsrf: true })

      if (res.ok) {
        setUser(await res.json())
        return
      }

      if (isPublic) return

      if (res.status === 401) {
        const refreshed = await refreshTokens()
        if (refreshed) {
          const res2 = await authFetch('/auth/me', { skipCsrf: true })
          if (res2.ok) {
            setUser(await res2.json())
            return
          }
        }
      }

      await apiLogout()
      router.push('/login')
    }

    init().finally(() => setLoading(false))
  }, [])

  const signin = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const profile = await apiLogin(email, password)
      setUser(profile)
      toast.success("Bem-vindo de volta!")
      router.push("/")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login")
      throw err
    } finally {
      setLoading(false)
    }
  }, [router])

  const updatePassword = useCallback(async (newPassword: string) => {
    const res = await authFetch('/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Erro ao alterar senha' }))
      throw new Error(err.detail || 'Erro ao alterar senha')
    }
    toast.success("Senha alterada com sucesso!")
  }, [])

  const signout = useCallback(async () => {
    setLoading(true)
    try {
      await apiLogout()
      setUser(null)
      toast.success("Até logo!")
      router.push("/login")
      router.refresh()
    } catch {
      toast.error("Erro ao sair")
    } finally {
      setLoading(false)
    }
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading, signin, signout, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
