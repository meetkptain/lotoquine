"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Pause, Undo2, Fullscreen, Trophy, Sparkles,
  Save, Play, HelpCircle, Timer, ArrowRight, Pencil, RotateCcw,
} from "lucide-react"
import { toast } from "sonner"
import type { CardRanking, Game, Card as CardType } from "@/types"
import { GameEngine } from "@/engine"

export default function LivePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = Number(params.gameId)

  const [game, setGame] = useState<Game | null>(null)
  const [engine, setEngine] = useState<GameEngine | null>(null)
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [lastNumber, setLastNumber] = useState<number | null>(null)
  const [topCards, setTopCards] = useState<CardRanking[]>([])
  const [winner, setWinner] = useState<CardRanking | null>(null)
  const [status, setStatus] = useState<"idle" | "running" | "finished" | "paused">("idle")
  const [activeCardCount, setActiveCardCount] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cursorHidden, setCursorHidden] = useState(false)
  const [preparing, setPreparing] = useState(true)
  const [saved, setSaved] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [editCardId, setEditCardId] = useState<number | null>(null)
  const [editNumbers, setEditNumbers] = useState<string[]>([])
  const [editSerial, setEditSerial] = useState("")
  const [savingCard, setSavingCard] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const cursorTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveTimerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const engineRef = useRef<GameEngine | null>(null)
  const startTimeRef = useRef<number>(0)

  const updateUI = useCallback((eng: GameEngine) => {
    const state = eng.getState()
    setDrawnNumbers([...state.drawnNumbers])
    setTopCards([...state.topCards])
    setWinner(state.winner ? { ...state.winner } : null)
    setStatus(state.status)
    setActiveCardCount(state.activeCardCount)
  }, [])

  const initGame = useCallback(async () => {
    if (isNaN(gameId)) return
    setPreparing(true)
    try {
      const { getGameAction, startGameAction, getCardsForGameAction } = await import(
        "@/actions/game.actions"
      )

      const g = await getGameAction(gameId)
      if (!g) { toast.error("Partie introuvable"); setPreparing(false); return }
      setGame(g)

      if (g.status === "WAITING") {
        const started = await startGameAction(gameId)
        const cards: CardType[] = started.cards.map((c: any) => ({
          id: c.id, serialNumber: c.serialNumber,
          numbers: c.numbers, active: c.active, createdAt: new Date(),
        }))
        const eng = new GameEngine(cards, gameId, g.name)
        eng.startGame()
        setGame(started.game)
        setEngine(eng)
        updateUI(eng)
        startTimeRef.current = Date.now()
      } else {
        // RUNNING or FINISHED — load state and replay draws
        const [cards, drawnNums] = await Promise.all([
          getCardsForGameAction(gameId),
          import("@/actions/game.actions").then((m) => m.getDrawnNumbersAction(gameId)),
        ])
        const typedCards: CardType[] = cards.map((c: any) => ({
          id: c.id, serialNumber: c.serialNumber,
          numbers: c.numbers, active: c.active, createdAt: new Date(),
        }))
        const eng = new GameEngine(typedCards, gameId, g.name)
        eng.startGame()
        for (const n of drawnNums) {
          try { eng.drawNumber(n) } catch { /* skip dupes */ }
        }
        setEngine(eng)
        setDrawnNumbers(drawnNums)
        updateUI(eng)
        startTimeRef.current = Date.now() - drawnNums.length * 5000
      }
    } catch (e: any) {
      console.error("[LIVE] init error:", e)
      toast.error(e.message || "Erreur d'initialisation")
    } finally {
      setPreparing(false)
    }
  }, [gameId, updateUI])

  const handleDraw = useCallback(async () => {
    const num = parseInt(inputValue, 10)
    if (isNaN(num)) return
    setInputValue("")

    const eng = engine
    if (!eng) return

    try {
      eng.drawNumber(num)
      updateUI(eng)
      setLastNumber(num)
      inputRef.current?.focus()

      const state = eng.getState()
      if (state.winner) {
        toast.success(`🎯 Carton plein ! ${state.winner.serialNumber}`, {
          duration: 8000,
          action: { label: "Arrêter", onClick: () => { setStatus("finished"); setWinner(state.winner) } },
        })
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [inputValue, engine, updateUI])

  const handleUndo = useCallback(() => {
    const eng = engine
    if (!eng) return
    try {
      const result = eng.undoLastDraw()
      if (result) { setLastNumber(result.number); updateUI(eng) }
    } catch (e: any) { toast.error(e.message) }
  }, [engine, updateUI])

  function togglePause() {
    const eng = engine
    if (!eng) return
    if (eng.getStatus() === "paused") { eng.resume(); setStatus("running") }
    else { eng.pause(); setStatus("paused") }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  function handleNewGame() { router.push("/dashboard") }

  function openEditCard(cardId: number, serial: string, numbers: number[]) {
    setEditCardId(cardId)
    setEditSerial(serial)
    setEditNumbers(numbers.map(String))
  }

  async function saveCardEdit() {
    if (!editCardId || !engine) return
    const nums = editNumbers.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= 90)
    if (nums.length === 0) { toast.error("Au moins un numéro valide"); return }
    setSavingCard(true)
    try {
      const { updateCardAction } = await import("@/actions/game.actions")
      await updateCardAction(editCardId, { numbers: nums })
      engine.reloadCard(editCardId, nums)
      toast.success("Carton corrigé et rechargé dans la partie")
      setEditCardId(null)
      updateUI(engine)
    } catch (e: any) { toast.error(e.message) }
    finally { setSavingCard(false) }
  }

  function handleContinueAfterWin() {
    const eng = engine
    if (!eng) return
    eng.continueGame()
    setStatus("running")
    setWinner(null)
    updateUI(eng)
    inputRef.current?.focus()
  }

  // Init
  useEffect(() => { if (!isNaN(gameId)) initGame() }, [gameId])

  // Focus input when running
  useEffect(() => { if (engine && status === "running") inputRef.current?.focus() }, [engine, status])

  // Timer
  useEffect(() => {
    if (status === "running") {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [status])

  // Auto-save
  useEffect(() => {
    if (status === "running" || status === "paused") {
      saveTimerRef.current = setInterval(() => {
        const eng = engineRef.current
        if (eng && game) {
          import("@/lib/persistence").then(({ saveGameState }) => {
            saveGameState(game.id, game.name, eng.getDrawnNumbers())
            setSaved(true)
          })
        }
      }, 5000)
    }
    return () => { if (saveTimerRef.current) clearInterval(saveTimerRef.current) }
  }, [status, game])

  useEffect(() => { engineRef.current = engine }, [engine])

  // Save winner
  useEffect(() => {
    if (winner && game) {
      import("@/lib/persistence").then(({ saveGameState }) => saveGameState(game.id, game.name, drawnNumbers))
      import("@/actions/game.actions").then(({ saveDrawnNumbersAction }) =>
        saveDrawnNumbersAction(game.id, drawnNumbers, winner.cardId))
    }
  }, [winner, game, drawnNumbers])

  // Keyboard — use refs to avoid dependency array churn
  const handleUndoRef = useRef(handleUndo)
  handleUndoRef.current = handleUndo
  const handleContinueRef = useRef(handleContinueAfterWin)
  handleContinueRef.current = handleContinueAfterWin
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!engineRef.current) return
      if (e.key === "Escape") { e.preventDefault(); handleUndoRef.current() }
      if (e.key === " ") { e.preventDefault(); togglePause() }
      if (e.key === "f" || e.key === "F") { toggleFullscreen() }
      if ((e.key === "n" || e.key === "N") && statusRef.current === "finished") { handleNewGame() }
      if ((e.key === "c" || e.key === "C") && statusRef.current === "finished") { handleContinueRef.current() }
      if (e.key === "?" || e.key === "h" || e.key === "H") { setShowHelp((v) => !v) }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Cursor hide in fullscreen
  useEffect(() => {
    function handleMouseMove() {
      setCursorHidden(false)
      clearTimeout(cursorTimeout.current)
      cursorTimeout.current = setTimeout(() => {
        if (document.fullscreenElement) setCursorHidden(true)
      }, 3000)
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    function handleFSChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener("fullscreenchange", handleFSChange)
    return () => document.removeEventListener("fullscreenchange", handleFSChange)
  }, [])

  function formatTime(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, "0")}`
  }

  // Loading state
  if (preparing || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">
            {preparing ? "Préparation de la partie..." : "Chargement..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${cursorHidden ? "cursor-none" : ""}`}>
      {/* Header */}
      <header className={`border-b border-border bg-card/95 backdrop-blur px-3 py-2 flex items-center justify-between gap-2 ${isFullscreen ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-primary tracking-tight text-sm sm:text-base">LOTOQUINE</span>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-xs sm:text-sm font-medium truncate">{game.name}</span>
          <Badge variant={status === "running" ? "default" : status === "finished" ? "outline" : "secondary"} className="text-[9px] px-1.5 py-0">
            {status === "running" ? "EN DIRECT" : status === "paused" ? "EN PAUSE" : status === "finished" ? "TERMINÉ" : "PRÊT"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Timer className="w-3 h-3" />
          <span className="tabular-nums">{formatTime(elapsed)}</span>
          <span className="ml-1">{activeCardCount} cartons</span>
          <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Aide (?)" type="button">
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 sm:px-6 py-3 max-w-6xl mx-auto w-full gap-3 relative">
        {/* Pause overlay */}
        {status === "paused" && (
          <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto animate-pulse">
                <Pause className="w-7 h-7 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-bold">PARTIE EN PAUSE</h2>
              <p className="text-sm text-muted-foreground">ESPACE pour reprendre</p>
            </div>
          </div>
        )}

        {/* Help overlay */}
        {showHelp && (
          <div className="absolute inset-0 z-30 bg-background/90 flex items-center justify-center rounded-lg" onClick={() => setShowHelp(false)}>
            <Card className="max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-lg">Raccourcis clavier</h3>
                <div className="space-y-1.5 text-sm">
                  {[
                    ["ENTRÉE", "Valider le numéro"],
                    ["ESC", "Annuler le dernier tirage"],
                    ["ESPACE", "Pause / Reprise"],
                    ["F", "Plein écran"],
                    ["N", "Nouvelle partie (après gagnant)"],
                    ["? / H", "Cette aide"],
                    ["C", "Continuer la partie (après gagnant)"],
                  ].map(([key, desc]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono font-bold">{key}</kbd>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHelp(false)}>
                  Fermer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full winner screen when operator clicked "Arrêter" */}
        {status === "finished" && winner && (
          <div className="absolute inset-0 z-20 bg-background/90 flex items-center justify-center rounded-lg">
            <Card className="border-primary animate-glow-pulse max-w-sm mx-auto">
              <CardContent className="py-8 text-center space-y-3">
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto animate-bounce" />
                <h2 className="text-3xl font-bold text-primary">GAGNANT</h2>
                <p className="text-2xl font-mono font-bold">{winner.serialNumber}</p>
                <p className="text-sm text-muted-foreground">{winner.foundCount}/{winner.totalCount} numéros trouvés</p>
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="lg" onClick={handleNewGame}>
                    <Sparkles className="w-4 h-4 mr-2" /> Nouvelle partie
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => { setStatus("running"); setWinner(null) }}>
                    <ArrowRight className="w-4 h-4 mr-2" /> Continuer
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  <kbd className="px-1 bg-muted rounded font-mono">N</kbd> nouvelle ·
                  <kbd className="px-1 bg-muted rounded font-mono">C</kbd> continuer
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Number grid — 1 to 90, tap to draw */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Tirés : {drawnNumbers.length}/90
            </p>
            <span className="text-lg font-bold tabular-nums text-primary">
              #{lastNumber ?? "—"}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
            {Array.from({ length: 90 }, (_, i) => {
              const num = i + 1
              const drawn = drawnNumbers.includes(num)
              const isLast = num === lastNumber
              return (
                <button
                  key={num}
                  type="button"
                  className={`
                    aspect-square rounded-md text-sm sm:text-base font-mono font-bold
                    transition-all duration-100 active:scale-90
                    flex items-center justify-center
                    touch-manipulation select-none
                    w-full min-h-[36px] sm:min-h-[44px]
                    ${drawn
                      ? isLast
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/40 scale-110 z-10"
                        : "bg-muted text-muted-foreground/40 line-through"
                      : "bg-card border border-border text-foreground hover:bg-accent active:bg-accent"
                    }
                  `}
                  onClick={() => {
                    if (!drawn) {
                      setInputValue(String(num))
                      handleDraw()
                    }
                  }}
                  aria-label={`Numéro ${num}${drawn ? " (déjà tiré)" : ""}`}
                >
                  {num}
                </button>
              )
            })}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex gap-2 items-center">
          <Button variant="outline" className="h-12 flex-1 text-sm" onClick={handleUndo} disabled={drawnNumbers.length === 0}>
            <Undo2 className="w-4 h-4 mr-1.5" /> Annuler
          </Button>
          <Button variant="outline" className="h-12 flex-1 text-sm" onClick={togglePause}>
            <Pause className="w-4 h-4 mr-1.5" /> Pause
          </Button>
        </div>

        {/* Winner banner — non-blocking, game keeps running */}
        {winner && (
          <div className="rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 p-3 sm:p-4 flex items-center gap-3 animate-glow-pulse">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-yellow-500 uppercase tracking-wider">Carton plein</p>
              <p className="font-mono text-lg sm:text-xl font-bold">{winner.serialNumber}</p>
              <p className="text-xs text-muted-foreground">{winner.foundCount}/{winner.totalCount} numéros trouvés</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button className="h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm" variant="default" onClick={() => { engine?.continueGame(); setWinner(null) }}>
                <ArrowRight className="w-4 h-4 mr-1" /> Continuer
              </Button>
              <Button className="h-10 sm:h-12 px-3 sm:px-4 text-xs sm:text-sm" variant="destructive" onClick={() => { engine?.continueGame(); setStatus("finished"); setWinner(winner) }}>
                Arrêter
              </Button>
              <Button variant="ghost" size="icon" className="h-10 sm:h-12 w-10 sm:w-12" onClick={async () => {
                try {
                  const { getCardWithNumbersAction } = await import("@/actions/game.actions")
                  const detail = await getCardWithNumbersAction(winner.cardId)
                  if (detail) openEditCard(detail.id, detail.serialNumber, detail.numbers)
                } catch {}
              }} title="Corriger le carton">
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Top Cards */}
        <div className="flex-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">TOP CARTONS</p>
          <div className="space-y-1.5 max-h-[50vh] sm:max-h-[calc(100vh-420px)] overflow-y-auto">
            {topCards.length === 0 ? (
              <p className="text-xs text-muted-foreground">En attente des tirages...</p>
            ) : (
              topCards.map((card, i) => {
                const pct = Math.round((card.foundCount / card.totalCount) * 100)
                const isTop = i === 0
                const isWinner = winner?.cardId === card.cardId
                return (
                  <Card key={card.cardId} className={`transition-all ${isWinner ? "border-yellow-500 animate-glow-pulse" : isTop ? "border-primary/40" : "hover:bg-accent/50"}`}>
                    <CardContent className="flex items-center gap-3 py-2.5 px-3">
                      <span className={`text-sm font-bold shrink-0 w-5 text-center ${isWinner ? "text-yellow-500" : isTop ? "text-primary" : "text-muted-foreground"}`}>
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-sm font-medium truncate">{card.serialNumber}</p>
                          <p className="text-sm font-bold tabular-nums shrink-0">{pct}%</p>
                        </div>
                        <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${isWinner ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {card.foundCount}/{card.totalCount} numéros
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </main>

      {/* Inline edit dialog for correcting card numbers mid-game */}
      {editCardId && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4" onClick={() => setEditCardId(null)}>
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base">Corriger le carton</h3>
            <p className="text-xs text-muted-foreground font-mono">{editSerial}</p>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Nouveaux numéros (15)</p>
              <div className="grid grid-cols-5 gap-1.5">
                {editNumbers.map((val, i) => (
                  <input
                    key={i}
                    type="text"
                    inputMode="numeric"
                    className="h-10 text-center rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    value={val}
                    onChange={(e) => {
                      const next = [...editNumbers]
                      next[i] = e.target.value.replace(/\D/g, "")
                      setEditNumbers(next)
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveCardEdit} disabled={savingCard} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-1.5" />{savingCard ? "Sauvegarde..." : "Corriger et re-inclure"}
              </Button>
              <Button variant="outline" onClick={() => setEditCardId(null)}>Annuler</Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Les numéros corrigés sont rechargés dans la partie en cours</p>
          </div>
        </div>
      )}

    </div>
  )
}
