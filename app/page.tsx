"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.push("/dashboard")
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-pulse flex items-center gap-2">
        <div className="w-3 h-3 bg-primary rounded-full"></div>
        <div className="w-3 h-3 bg-primary rounded-full delay-75"></div>
        <div className="w-3 h-3 bg-primary rounded-full delay-150"></div>
      </div>
    </div>
  )
}
