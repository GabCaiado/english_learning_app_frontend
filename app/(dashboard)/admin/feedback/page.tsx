"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { AdminFeedbackView } from "@/components/features/admin-feedback-view"

export default function AdminFeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AdminFeedbackView />
    </Suspense>
  )
}
