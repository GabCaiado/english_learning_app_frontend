"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Volume2, Trash2, X, BookOpen, Video, MessageSquare, Sparkles } from "lucide-react"
import { WordDetailModal } from "@/components/word-detail-modal"

export function WordsBook() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  // Mock data - futuramente virá do banco de dados
  const words = [
    {
      word: "awesome",
      translation: "incrível, impressionante",
      category: "Adjetivo",
      difficulty: "Básico",
      examples: 3,
      hasVideo: true,
    },
    {
      word: "serendipity",
      translation: "acaso feliz, descoberta afortunada",
      category: "Substantivo",
      difficulty: "Avançado",
      examples: 2,
      hasVideo: false,
    },
    {
      word: "procrastinate",
      translation: "procrastinar, adiar",
      category: "Verbo",
      difficulty: "Intermediário",
      examples: 4,
      hasVideo: true,
    },
    {
      word: "ephemeral",
      translation: "efêmero, passageiro",
      category: "Adjetivo",
      difficulty: "Avançado",
      examples: 2,
      hasVideo: false,
    },
    {
      word: "literally",
      translation: "literalmente",
      category: "Advérbio",
      difficulty: "Básico",
      examples: 5,
      hasVideo: true,
    },
    {
      word: "vibe",
      translation: "energia, clima (gíria)",
      category: "Substantivo (Slang)",
      difficulty: "Intermediário",
      examples: 3,
      hasVideo: true,
      isSlang: true,
    },
  ]

  const filteredWords = words.filter(
    (w) =>
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.translation.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Básico":
        return "bg-success/10 text-success p-1 px-3 border-success/20"
      case "Intermediário":
        return "bg-orange-500/10 p-1 px-3 text-orange-600 border-orange-500/20"
      case "Avançado":
        return "bg-destructive/10 p-1 px-3 text-destructive border-destructive/20"
      default:
        return "bg-muted p-1 px-3 text-muted-foreground"
    }
  }

  return (
    <>
      <div className="p-8 max-w-9/12 mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">WORDS BOOK</p>
              <h2 className="text-3xl font-bold text-foreground">Seu Caderninho Digital</h2>
            </div>
          </div>
          <p className="text-muted-foreground">Todas as palavras que você salvou, organizadas e prontas para revisar</p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6 border-border/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar palavra ou tradução..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <Button variant="ghost" onClick={() => setSearchQuery("")}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Words List */}
        <div className="space-y-3">
          {filteredWords.map((word, index) => (
            <Card
              key={index}
              className="p-4 hover:border-primary/50 transition-all cursor-pointer group"
              onClick={() => setSelectedWord(word.word)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 flex items-center gap-4">
                  {/* Word & Translation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-foreground">{word.word}</h3>
                      {word.isSlang && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Gíria
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{word.translation}</p>
                  </div>

                  {/* Category & Difficulty */}
                  <div className="hidden md:flex items-center gap-2">
                    <Badge variant="outline" className="text-xs p-1 px-3">
                      {word.category}
                    </Badge>
                    <Badge variant="outline" className={`text-xs border ${getDifficultyColor(word.difficulty)}`}>
                      {word.difficulty}
                    </Badge>
                  </div>

                  {/* Info Icons */}
                  <div className="hidden lg:flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1 text-xs">
                      <MessageSquare className="w-4 h-4" />
                      <span>{word.examples}</span>
                    </div>
                    {word.hasVideo && (
                      <div className="flex items-center gap-1 text-xs text-primary">
                        <Video className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="group-hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Future: Play pronunciation
                    }}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Future: Delete word
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredWords.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Nenhuma palavra encontrada</h3>
            <p className="text-muted-foreground">Tente buscar por outro termo ou adicione novas palavras</p>
          </div>
        )}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordDetailModal word={selectedWord} isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} />
      )}
    </>
  )
}
