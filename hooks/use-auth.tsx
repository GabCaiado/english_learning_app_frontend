"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"

interface AuthContextType {
    user: User | null
    loading: boolean
    signout: () => Promise<void>
    updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            setLoading(false)

            if (_event === 'SIGNED_OUT') {
                router.push('/login')
                router.refresh()
            }
        })

        return () => subscription.unsubscribe()
    }, [router])

    async function updatePassword(password: string) {
        try {
            setLoading(true)
            const { error } = await supabase.auth.updateUser({
                password: password
            })
            if (error) throw error
            toast.success("Senha atualizada com sucesso!")
        } catch (error: any) {
            console.error("[Auth] Erro ao atualizar senha:", error)
            toast.error(error.message || "Erro ao atualizar senha")
        } finally {
            setLoading(false)
        }
    }

    async function signout() {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signOut()
            if (error) throw error
            toast.success("Até logo!")
            router.push("/login")
            router.refresh()
        } catch (error: any) {
            toast.error("Erro ao sair")
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthContext.Provider value={{ user, loading, signout, updatePassword }}>
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
