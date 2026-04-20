"use client"

import { Dashboard } from "@/components/features/dashboard-view"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()
  
  return (
    <Dashboard onNavigateToRevisions={() => router.push("/revisions")} />
  )
}
