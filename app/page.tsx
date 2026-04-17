"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { WordsBook } from "@/components/words-book"
import { Revisions } from "@/components/revisions"

export default function Home() {
  const [currentView, setCurrentView] = useState<"dashboard" | "words-book" | "revisions">("dashboard")

  return (
    <div className="flex h-screen bg-background">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto">
        {currentView === "dashboard" ? (
          <Dashboard onNavigateToRevisions={() => setCurrentView("revisions")} />
        ) : currentView === "words-book" ? (
          <WordsBook />
        ) : (
          <Revisions />
        )}
      </main>
    </div>
  )
}
