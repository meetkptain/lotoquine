"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import type { Game } from "@/types"

function statusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    WAITING: "secondary",
    RUNNING: "default",
    FINISHED: "outline",
  }
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>
}

export default function DashboardPage() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [cardCount, setCardCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dbInfo, setDbInfo] = useState<{
    dbName: string; branch: string; org: string; url: string
  } | null>(null)

  const load = useCallback(async () => {
    try {
      const { getGamesAction, getCardStatsAction, getDbInfoAction } = await import("@/actions/game.actions")
      const [allGames, stats, info] = await Promise.all([
        getGamesAction(),
        getCardStatsAction(),
        getDbInfoAction(),
      ])
      setGames(allGames.reverse().slice(0, 10))
      setCardCount(stats.active)
      setDbInfo(info)
    } catch (e) {
      console.error("Failed to load dashboard data", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const activeGame = games.find((g) => g.status === "RUNNING")

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <Link
          href="/live/new"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/80 transition-colors"
        >
          Nouvelle partie
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cartons actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{cardCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Parties totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{games.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeGame ? 1 : 0}</p>
          </CardContent>
        </Card>
      </div>

      {dbInfo && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Base de données</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">DB:</span> {dbInfo.dbName}</p>
            <p><span className="text-muted-foreground">Branch:</span> <span className={dbInfo.branch === "main" ? "text-green-600 font-medium" : "text-yellow-600 font-medium"}>{dbInfo.branch}</span></p>
            <p className="text-xs text-muted-foreground truncate">{dbInfo.url}</p>
          </CardContent>
        </Card>
      )}

      {activeGame && (
        <Card className="border-primary/50 animate-glow-pulse">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Partie en cours
              {statusBadge("RUNNING")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold mb-2">{activeGame.name}</p>
            <Link
              href={`/live/${activeGame.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Reprendre la partie
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3">Dernières parties</h2>
        {games.length === 0 ? (
          <p className="text-muted-foreground">Aucune partie pour le moment</p>
        ) : (
          <div className="space-y-2">
            {games.slice(0, 5).map((game) => (
              <Card key={game.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{game.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(game.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {statusBadge(game.status)}
                    {game.status === "RUNNING" && (
                      <Link
                        href={`/live/${game.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                      >
                        Jouer
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
