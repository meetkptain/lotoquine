"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, ArrowRight, Settings, Timer } from "lucide-react"
import type { Game } from "@/types"

export default function LiveHome() {
  const router = useRouter()
  const [activeGame, setActiveGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    import("@/actions/game.actions").then(({ getGamesAction }) =>
      getGamesAction().then((games) => {
        const running = games.find((g) => g.status === "RUNNING")
        setActiveGame(running ?? null)
        setLoading(false)
      })
    )
  }, [])

  async function handleNewGame() {
    setStarting(true)
    try {
      const { createAndStartGameAction } = await import("@/actions/game.actions")
      const { game } = await createAndStartGameAction()
      router.push(`/live/${game.id}`)
    } catch (e: any) {
      console.error(e)
      setStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">LOTOQUINE</h1>
          <p className="text-sm text-muted-foreground">Assistant de tirage</p>
        </div>

        <Button
          size="lg"
          className="w-full h-20 text-xl font-bold gap-3"
          onClick={handleNewGame}
          disabled={starting}
        >
          {starting ? (
            <span className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Play className="w-6 h-6" />
          )}
          {starting ? "Préparation..." : "Lancer une partie"}
        </Button>

        {activeGame && (
          <Card className="border-primary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Timer className="w-5 h-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Partie en cours</p>
                <p className="font-medium truncate text-sm">{activeGame.name}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => router.push(`/live/${activeGame.id}`)}>
                Reprendre <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center gap-4 pt-4 border-t border-border">
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            onClick={() => router.push("/cards")}
          >
            <Settings className="w-3 h-3" /> Gérer les cartons
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => router.push("/dashboard")}
          >
            Administration
          </button>
        </div>
      </div>
    </div>
  )
}
