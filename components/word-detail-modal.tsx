"use client"

import { X, Volume2, BookOpen, MessageSquare, Video, Sparkles, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WordDetailModalProps {
  word: string
  isOpen: boolean
  onClose: () => void
}

export function WordDetailModal({ word, isOpen, onClose }: WordDetailModalProps) {
  if (!isOpen) return null

  // Mock data - futuramente virá da API com IA
  const wordData = {
    word: word,
    phonetic: "/ˈɔːsəm/",
    translations: [
      { context: "Geral", meaning: "incrível, impressionante", example: "usado para expressar admiração" },
      { context: "Informal", meaning: "muito legal, demais", example: "gíria comum entre jovens" },
    ],
    examples: [
      {
        english: "That concert was absolutely awesome!",
        portuguese: "Aquele show foi absolutamente incrível!",
        context: "Expressando entusiasmo",
      },
      {
        english: "You're doing an awesome job!",
        portuguese: "Você está fazendo um trabalho incrível!",
        context: "Elogio",
      },
      {
        english: "This app has some awesome features.",
        portuguese: "Este app tem alguns recursos incríveis.",
        context: "Descrevendo qualidade",
      },
    ],
    usage: {
      frequency: "Alta",
      formality: "Informal",
      regions: ["EUA", "Reino Unido", "Austrália"],
    },
    videoUrl: "https://example.com/video",
    synonyms: ["amazing", "fantastic", "incredible", "outstanding"],
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-foreground">{wordData.word}</h2>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {wordData.usage.formality}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-muted-foreground">{wordData.phonetic}</p>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Volume2 className="w-4 h-4 mr-1" />
                  Ouvir
                </Button>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Translations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                Traduções Contextuais
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                A IA detectou diferentes significados baseados no contexto
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {wordData.translations.map((translation, index) => (
                <div key={index} className="p-4 rounded-lg border border-border bg-accent/30">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {translation.context}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground mb-1">{translation.meaning}</p>
                  <p className="text-sm text-muted-foreground">{translation.example}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Exemplos de Uso
              </CardTitle>
              <p className="text-sm text-muted-foreground">Frases reais para você entender como usar a palavra</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {wordData.examples.map((example, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/30">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-foreground font-medium">{example.english}</p>
                      <p className="text-muted-foreground text-sm">{example.portuguese}</p>
                      <Badge variant="outline" className="text-xs">
                        {example.context}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Video Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Video className="w-5 h-5 text-primary" />
                Pronúncia em Vídeo
              </CardTitle>
              <p className="text-sm text-muted-foreground">Veja nativos usando esta palavra em contextos reais</p>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center relative overflow-hidden border border-border">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Video className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Vídeo será carregado aqui</p>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver no YouTube
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Sinônimos</p>
                <div className="flex flex-wrap gap-2">
                  {wordData.synonyms.map((synonym, index) => (
                    <Badge key={index} variant="secondary">
                      {synonym}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Frequência de Uso</p>
                <Badge className="bg-success text-success-foreground">{wordData.usage.frequency}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Regiões Comuns</p>
                <div className="flex flex-wrap gap-2">
                  {wordData.usage.regions.map((region, index) => (
                    <Badge key={index} variant="outline">
                      {region}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
