"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, BookMarked, Target, Flame, Calendar, Sparkles, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface DashboardProps {
  onNavigateToRevisions: () => void
}

export function Dashboard({ onNavigateToRevisions }: DashboardProps) {
  const [newWord, setNewWord] = useState("")

  const progressData = [
    { day: "Dom", words: 3 },
    { day: "Seg", words: 5 },
    { day: "Ter", words: 8 },
    { day: "Qua", words: 6 },
    { day: "Qui", words: 10 },
    { day: "Sex", words: 7 },
    { day: "Sáb", words: 8 },
  ]

  const wordsToReview = [
    { word: "procrastinate", translation: "procrastinar", lastReview: "5 dias atrás", priority: "high" },
    { word: "serendipity", translation: "acaso feliz", lastReview: "3 dias atrás", priority: "medium" },
    { word: "resilient", translation: "resiliente", lastReview: "2 dias atrás", priority: "low" },
  ]

  const wordOfTheDay = {
    word: "ephemeral",
    translation: "efêmero",
    level: "Intermediário",
    example: "Beauty is often ephemeral, lasting only for a moment.",
    examplePt: "A beleza é frequentemente efêmera, durando apenas um momento.",
  }

  const stats = [
    { label: "Palavras Aprendidas", value: "47", icon: BookMarked, color: "text-primary" },
    { label: "Sequência Diária", value: "12", icon: Flame, color: "text-orange-500" },
    { label: "Esta Semana", value: "8", icon: Calendar, color: "text-blue-500" },
  ]

  const weeklyGoal = {
    current: 8,
    target: 10,
    percentage: 80,
  }

  return (
    <div className="p-8 max-w-10/12 mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookMarked className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">DASHBOARD</p>
            <h2 className="text-3xl font-bold text-foreground">Olá, Gabriella</h2>
          </div>
        </div>
        <p className="text-xl text-primary font-medium">Vamos aprender novas palavras hoje!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-accent flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Word */}
      <Card className="border-primary/20 bg-accent/30 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Adicionar Nova Palavra
          </CardTitle>
          <p className="text-sm text-muted-foreground">Descubriu uma palavra nova? Adicione ao seu dicionário!</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Digite a palavra em inglês..."
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="flex-1"
            />
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A IA irá buscar traduções, exemplos e pronúncia automaticamente
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Palavra do Dia
            </CardTitle>
            <p className="text-sm text-muted-foreground">Sugestão personalizada para você</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-foreground">{wordOfTheDay.word}</h3>
                  <Badge variant="secondary">{wordOfTheDay.level}</Badge>
                </div>
                <p className="text-lg text-muted-foreground">{wordOfTheDay.translation}</p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 border border-border">
                <p className="text-sm text-foreground italic mb-1">{wordOfTheDay.example}</p>
                <p className="text-xs text-muted-foreground">{wordOfTheDay.examplePt}</p>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar ao meu dicionário
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-success" />
              Próximo Objetivo
            </CardTitle>
            <p className="text-sm text-muted-foreground">Meta semanal de aprendizado</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-foreground mb-2">
                  {weeklyGoal.current}
                  <span className="text-2xl text-muted-foreground">/{weeklyGoal.target}</span>
                </p>
                <p className="text-sm text-muted-foreground">palavras esta semana</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-semibold text-success">{weeklyGoal.percentage}%</span>
                </div>
                <Progress value={weeklyGoal.percentage} className="h-3" />
                <p className="text-xs text-muted-foreground text-center">
                  Faltam apenas {weeklyGoal.target - weeklyGoal.current} palavras para atingir sua meta!
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-success text-success hover:bg-success/10 bg-transparent"
              >
                Ver todas as metas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Seu Progresso
            </CardTitle>
            <p className="text-sm text-muted-foreground">Palavras aprendidas nos últimos 7 dias</p>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                words: {
                  label: "Palavras",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="words"
                    stroke="var(--color-words)"
                    strokeWidth={3}
                    dot={{ fill: "var(--color-words)", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              Revisão Inteligente
            </CardTitle>
            <p className="text-sm text-muted-foreground">Palavras que precisam ser revisadas hoje</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wordsToReview.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-orange-500/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{item.word}</p>
                      <Badge
                        variant={
                          item.priority === "high"
                            ? "destructive"
                            : item.priority === "medium"
                              ? "default"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {item.priority === "high" ? "Urgente" : item.priority === "medium" ? "Médio" : "Baixo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.translation}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                  >
                    Revisar
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4 border-orange-500 text-orange-500 hover:bg-orange-500/10 bg-transparent"
              onClick={onNavigateToRevisions}
            >
              Ver todas as revisões
            </Button>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
