"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { WordsBook } from "@/components/features/words-view"

export default function WordsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <WordsBook />
    </Suspense>
  )
}
