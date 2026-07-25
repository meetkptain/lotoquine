"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card as UICard, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, X, Plus, Eye, Pencil, Trash2, Check, ArrowLeft, CheckSquare, Square, Trash } from "lucide-react"
import type { Card as CardType } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface CardDetail {
  id: number
  serialNumber: string
  numbers: number[]
  active: boolean
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [newSerial, setNewSerial] = useState("")
  const [newNumbers, setNewNumbers] = useState("")

  // View detail
  const [viewCard, setViewCard] = useState<CardDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Edit
  const [editCard, setEditCard] = useState<CardDetail | null>(null)
  const [editSerial, setEditSerial] = useState("")
  const [editNumbers, setEditNumbers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Selection mode
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deletingMany, setDeletingMany] = useState(false)

  async function loadCards(query?: string) {
    setLoading(true)
    try {
      const { getCardsAction, searchCardsAction } = await import("@/actions/game.actions")
      const result = query ? await searchCardsAction(query) : await getCardsAction()
      setCards(result)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCards()
    // Check URL for ?id= to auto-open a card
    const params = new URLSearchParams(window.location.search)
    const cardId = params.get("id")
    if (cardId) viewCardDetail(Number(cardId))
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    const timeout = setTimeout(() => loadCards(value), 300)
    return () => clearTimeout(timeout)
  }

  async function handleAddCard() {
    if (!newSerial.trim()) { toast.error("Numéro de série requis"); return }
    const numbers = newNumbers.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 90)
    if (numbers.length === 0) { toast.error("Au moins un numéro requis (1-90)"); return }

    try {
      const { addCardAction } = await import("@/actions/game.actions")
      await addCardAction({ serialNumber: newSerial.trim().toUpperCase(), numbers })
      toast.success("Carton ajouté")
      setNewSerial(""); setNewNumbers("")
      loadCards()
    } catch (e: any) { toast.error(e.message || "Erreur") }
  }

  async function handleDelete(id: number) {
    if (!confirm("Désactiver ce carton ?")) return
    try {
      const { deleteCardAction } = await import("@/actions/game.actions")
      await deleteCardAction(id)
      toast.success("Carton désactivé")
      if (viewCard?.id === id) setViewCard(null)
      loadCards()
    } catch (e: any) { toast.error(e.message) }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    const msg = `Désactiver ${selectedIds.size} carton(s) ?`
    if (!confirm(msg)) return
    setDeletingMany(true)
    try {
      const { deleteCardAction } = await import("@/actions/game.actions")
      await Promise.all(Array.from(selectedIds).map(deleteCardAction))
      toast.success(`${selectedIds.size} carton(s) désactivé(s)`)
      setSelectedIds(new Set())
      setSelectMode(false)
      loadCards()
    } catch (e: any) { toast.error(e.message) }
    finally { setDeletingMany(false) }
  }

  function toggleSelect(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (selectedIds.size === cards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(cards.map((c) => c.id)))
    }
  }

  async function viewCardDetail(id: number) {
    setLoadingDetail(true)
    try {
      const { getCardWithNumbersAction } = await import("@/actions/game.actions")
      const detail = await getCardWithNumbersAction(id)
      if (detail) setViewCard(detail)
    } finally { setLoadingDetail(false) }
  }

  function openEdit(card: CardDetail) {
    setEditCard(card)
    setEditSerial(card.serialNumber)
    setEditNumbers(card.numbers.map(String))
  }

  function handleEditNumberChange(index: number, value: string) {
    const next = [...editNumbers]
    next[index] = value.replace(/\D/g, "")
    setEditNumbers(next)
  }

  async function saveEdit() {
    if (!editCard) return
    const numbers = editNumbers.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 90)
    if (numbers.length === 0) { toast.error("Au moins un numéro valide"); return }

    setSaving(true)
    try {
      const { updateCardAction } = await import("@/actions/game.actions")
      await updateCardAction(editCard.id, {
        serialNumber: editSerial.trim().toUpperCase(),
        numbers,
      })
      toast.success("Carton mis à jour")
      setEditCard(null)
      if (viewCard) viewCardDetail(editCard.id)
      loadCards()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {viewCard && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewCard(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-xl sm:text-2xl font-bold">
            {viewCard ? "Détail carton" : "Cartons"}
          </h1>
        </div>
        {!viewCard && (
          <div className="flex items-center gap-1.5">
            <Dialog>
              <DialogTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 sm:px-4 py-2 text-sm font-medium hover:bg-primary/80 transition-colors">
                <Plus className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Ajouter</span>
                <span className="sm:hidden">+</span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un carton</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Numéro de série</label>
                    <Input placeholder="FD000001" value={newSerial} onChange={(e) => setNewSerial(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Numéros (séparés par des espaces)</label>
                    <Input placeholder="12 34 45 67 89 ..." value={newNumbers} onChange={(e) => setNewNumbers(e.target.value)} />
                  </div>
                  <Button onClick={handleAddCard} className="w-full">Ajouter le carton</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()) }}>
              {selectMode ? <CheckSquare className="w-4 h-4 mr-1.5" /> : <Square className="w-4 h-4 mr-1.5" />}
              {selectMode ? "Fini" : "Sélection"}
            </Button>
          </div>
        )}
      </div>

      {/* Search — only in list mode */}
      {!viewCard && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher par numéro de série..." className="pl-10" value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      )}

      {/* Detail view */}
      {viewCard ? (
        <CardDetailView
          card={viewCard}
          loading={loadingDetail}
          onEdit={() => openEdit(viewCard)}
          onDelete={() => handleDelete(viewCard.id)}
          onRefresh={() => viewCardDetail(viewCard.id)}
        />
      ) : loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : cards.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Aucun carton trouvé</p>
      ) : (
        <>
        <div className="space-y-1.5">
          {cards.map((card) => (
            <UICard key={card.id} className={`transition-colors ${selectMode ? "" : "cursor-pointer hover:bg-accent/50"}`}
              onClick={() => { if (!selectMode) viewCardDetail(card.id) }}>
              <CardContent className="flex items-center justify-between py-2.5 px-3 sm:px-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  {selectMode && (
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(card.id) }}
                      className="shrink-0 p-1 rounded hover:bg-muted transition-colors">
                      {selectedIds.has(card.id)
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  )}
                  <span className="font-mono text-sm font-medium truncate">{card.serialNumber}</span>
                  <Badge variant={card.active ? "outline" : "secondary"} className="text-[10px] px-1.5 shrink-0">
                    {card.active ? "Actif" : "Inactif"}
                  </Badge>
                </div>
                {!selectMode && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); viewCardDetail(card.id) }} title="Voir">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(card.id) }} title="Désactiver">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </UICard>
          ))}
        </div>

        {selectMode && (
          <div className="sticky bottom-0 bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-muted transition-colors">
                {selectedIds.size === cards.length
                  ? <CheckSquare className="w-4 h-4 text-primary" />
                  : <Square className="w-4 h-4 text-muted-foreground" />}
              </button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} / {cards.length} sélectionné(s)
              </span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || deletingMany}>
              <Trash className="w-4 h-4 mr-1.5" />
              {deletingMany ? "Suppression..." : "Supprimer (" + selectedIds.size + ")"}
            </Button>
          </div>
        )}
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editCard} onOpenChange={(open) => { if (!open) setEditCard(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Modifier le carton</DialogTitle></DialogHeader>
          {editCard && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Numéro de série</label>
                <Input value={editSerial} onChange={(e) => setEditSerial(e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Numéros (15)</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {editNumbers.map((val, i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      className="h-10 text-center rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      value={val}
                      onChange={(e) => handleEditNumberChange(i, e.target.value)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={saving} className="flex-1">
                  <Check className="w-4 h-4 mr-1.5" />{saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                <Button variant="outline" onClick={() => setEditCard(null)}>Annuler</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CardDetailView({
  card, loading, onEdit, onDelete, onRefresh,
}: {
  card: CardDetail
  loading: boolean
  onEdit: () => void
  onDelete: () => void
  onRefresh: () => void
}) {
  const sorted = [...card.numbers].sort((a, b) => a - b)

  if (loading) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <UICard>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Carton</p>
            <p className="text-xl sm:text-2xl font-mono font-bold mt-1">{card.serialNumber}</p>
            <Badge variant={card.active ? "default" : "secondary"} className="mt-2">
              {card.active ? "Actif" : "Inactif"}
            </Badge>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {card.numbers.length} numéros
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {sorted.map((num, i) => (
                <div key={i} className="h-10 flex items-center justify-center rounded-lg bg-muted text-sm font-mono font-bold">
                  {num}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-1.5" /> Modifier
            </Button>
            <Button variant="outline" className="flex-1 text-red-500 hover:text-red-600" onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
            </Button>
          </div>
        </CardContent>
      </UICard>
    </div>
  )
}
