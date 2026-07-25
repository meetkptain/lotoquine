"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import type { Card as CardType } from "@/types"

export default function NewGamePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [availableCards, setAvailableCards] = useState<CardType[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    import("@/actions/game.actions").then(({ getCardsAction }) =>
      getCardsAction().then((cards) => {
        setAvailableCards(cards)
        setSelectedCards(new Set(cards.map((c) => c.id)))
      })
    )
  }, [])

  function toggleCard(id: number) {
    const next = new Set(selectedCards)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedCards(next)
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Donnez un nom à la partie")
      return
    }
    if (selectedCards.size === 0) {
      toast.error("Sélectionnez au moins un carton")
      return
    }

    setCreating(true)
    try {
      const { createGameAction } = await import("@/actions/game.actions")
      const game = await createGameAction(name.trim(), Array.from(selectedCards))
      toast.success("Partie créée !")
      router.push(`/live/${game.id}`)
    } catch (e: any) {
      toast.error(e.message || "Erreur")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto space-y-5 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Nouvelle partie</h1>

      <div className="space-y-2">
        <Label>Nom de la partie</Label>
        <Input
          placeholder="Lotoquine Free Dom 21/07"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate()
          }}
        />
      </div>

      <div>
        <Label>Cartons participants ({selectedCards.size}/{availableCards.length})</Label>
        <Card className="mt-2 max-h-80 overflow-y-auto">
          <CardContent className="p-2 space-y-1">
            {availableCards.length === 0 ? (
              <p className="text-sm text-muted-foreground p-2">
                Aucun carton disponible. Importez d&apos;abord des cartons.
              </p>
            ) : (
              availableCards.map((card) => (
                <div
                  key={card.id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                    selectedCards.has(card.id)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleCard(card.id)}
                >
                  <div
                    className={`w-4 h-4 rounded border-2 ${
                      selectedCards.has(card.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                  <span className="font-mono text-sm">{card.serialNumber}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleCreate} disabled={creating} size="lg" className="sm:text-base">
          {creating ? "Création..." : "Créer et commencer"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/dashboard")} size="lg">
          Annuler
        </Button>
      </div>
    </div>
  )
}
