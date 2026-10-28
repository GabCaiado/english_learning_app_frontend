"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-background bg-gradient-to-br from-primary-soft/60 via-background to-primary-soft/40">
      <div className="animate-pulse flex items-center gap-2">
        <div className="size-3 rounded-full bg-primary" />
        <div className="size-3 rounded-full bg-primary delay-75" />
        <div className="size-3 rounded-full bg-primary delay-150" />
      </div>
    </div>
  )
}
