"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Pause, Undo2, Trophy, Sparkles,
  HelpCircle, Timer, ArrowRight, Pencil, RotateCcw, Plus,
} from "lucide-react"
import { toast } from "sonner"
import type { CardRanking, Game, Card as CardType } from "@/types"
import { GameEngine } from "@/engine"
import { MAX_NUMBER } from "@/lib/constants"

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = "sine"
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch {}
}

function playWinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = "sine"
      gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.15)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.15)
    })
  } catch {}
}

export default function LivePage() {
  const params = useParams()
  const router = useRouter()
  const gameId = Number(params.gameId)

  const [game, setGame] = useState<Game | null>(null)
  const [engine, setEngine] = useState<GameEngine | null>(null)
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [lastNumber, setLastNumber] = useState<number | null>(null)
  const [topCards, setTopCards] = useState<CardRanking[]>([])
  const [winner, setWinner] = useState<CardRanking[]>([])
  const [status, setStatus] = useState<"idle" | "running" | "finished" | "paused">("idle")
  const [activeCardCount, setActiveCardCount] = useState(0)
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
  const [startingNew, setStartingNew] = useState(false)

  const cursorTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
  const saveTimerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const engineRef = useRef<GameEngine | null>(null)
  const startTimeRef = useRef<number>(0)

  const updateUI = useCallback((eng: GameEngine) => {
    const state = eng.getState()
    setDrawnNumbers([...state.drawnNumbers])
    setTopCards([...state.topCards])
    setWinner([...state.winners])
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

  const handleDraw = useCallback(async (num: number) => {
    const eng = engine
    if (!eng) return

    try {
      eng.drawNumber(num)
      updateUI(eng)
      setLastNumber(num)
      playBeep()

      const state = eng.getState()
      if (state.winners.length > 0) {
        playWinSound()
        const serials = state.winners.map(w => w.serialNumber).join(", ")
        toast.success(`🎯 Carton plein ! ${serials}`, {
          duration: 8000,
          action: {
            label: "Arrêter",
            onClick: () => { setStatus("finished"); setWinner([...state.winners]) },
          },
        })
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [engine, updateUI])

  const handleUndo = useCallback(() => {
    const eng = engine
    if (!eng) return
    try {
      const result = eng.undoLastDraw()
      if (result) { setLastNumber(result.number); updateUI(eng) }
    } catch (e: any) { toast.error(e.message) }
  }, [engine, updateUI])

  const handleUnDraw = useCallback((num: number) => {
    const eng = engine
    if (!eng) return
    try {
      eng.unDrawNumber(num)
      setLastNumber(eng.getDrawnNumbers().at(-1) ?? null)
      updateUI(eng)
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

  function openEditCard(cardId: number, serial: string, numbers: number[]) {
    setEditCardId(cardId)
    setEditSerial(serial)
    setEditNumbers(numbers.map(String))
  }

  async function saveCardEdit() {
    if (!editCardId || !engine) return
    const nums = editNumbers.map(Number).filter((n) => !isNaN(n) && n >= 1 && n <= MAX_NUMBER)
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
    setWinner([])
    updateUI(eng)
  }

  async function handleStartNewGame() {
    setStartingNew(true)
    try {
      const { createAndStartGameAction } = await import("@/actions/game.actions")
      const { game: newGame } = await createAndStartGameAction()
      router.push(`/live/${newGame.id}`)
    } catch (e: any) {
      toast.error(e.message || "Erreur")
      setStartingNew(false)
    }
  }

  // Init
  useEffect(() => { if (!isNaN(gameId)) initGame() }, [gameId])

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
    if (winner.length > 0 && game) {
      import("@/lib/persistence").then(({ saveGameState }) => saveGameState(game.id, game.name, drawnNumbers))
      import("@/actions/game.actions").then(({ saveDrawnNumbersAction }) =>
        saveDrawnNumbersAction(game.id, drawnNumbers, winner[0]?.cardId ?? null))
    }
  }, [winner, game, drawnNumbers])

  // Keyboard — use refs to avoid dependency array churn
  const handleUndoRef = useRef(handleUndo)
  handleUndoRef.current = handleUndo
  const handleContinueRef = useRef(handleContinueAfterWin)
  handleContinueRef.current = handleContinueAfterWin
  const handleNewRef = useRef(handleStartNewGame)
  handleNewRef.current = handleStartNewGame
  const statusRef = useRef(status)
  statusRef.current = status

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!engineRef.current) return
      if (e.key === "Escape") { e.preventDefault(); handleUndoRef.current() }
      if (e.key === " ") { e.preventDefault(); togglePause() }
      if (e.key === "f" || e.key === "F") { toggleFullscreen() }
      if (e.key === "n" || e.key === "N") { handleNewRef.current() }
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
          <Badge variant={status === "running" ? "default" : status === "finished" ? "outline" : "secondary"} className="text-xs px-2 py-0.5">
            {status === "running" ? "EN DIRECT" : status === "paused" ? "EN PAUSE" : status === "finished" ? "TERMINÉ" : "PRÊT"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Timer className="w-3 h-3" />
          <span className="tabular-nums">{formatTime(elapsed)}</span>
          <span className="ml-1 hidden sm:inline">{activeCardCount} cartons</span>
          <Button variant="ghost" size="sm" className="h-11 px-3 text-xs gap-1.5" onClick={handleStartNewGame} disabled={startingNew}>
            <Plus className="w-3 h-3" /> Nouvelle
          </Button>
          <button onClick={() => setShowHelp(true)} className="p-2.5 rounded-lg hover:bg-muted transition-colors min-h-11 min-w-11 flex items-center justify-center" title="Aide (?)" type="button">
            <HelpCircle className="w-5 h-5" />
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
              <Button variant="default" size="lg" onClick={togglePause}>Reprendre</Button>
            </div>
          </div>
        )}

        {/* Help overlay */}
        {showHelp && (
          <div className="absolute inset-0 z-30 bg-background/90 flex items-center justify-center rounded-lg" onClick={() => setShowHelp(false)}>
            <Card className="max-w-sm mx-auto" onClick={(e) => e.stopPropagation()}>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-lg">Aide</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Tapez un numéro dans la grille pour le tirer.</p>
                  <div className="space-y-1.5 text-sm border-t border-border pt-2">
                    <p className="font-medium text-xs text-muted-foreground">Raccourcis</p>
                    {[
                      ["ESC", "Annuler le dernier tirage"],
                      ["ESPACE", "Pause / Reprise"],
                      ["F", "Plein écran"],
                      ["N", "Nouvelle partie"],
                      ["? / H", "Cette aide"],
                      ["C", "Continuer la partie (après gagnant)"],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex justify-between gap-4">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono font-bold">{key}</kbd>
                        <span className="text-muted-foreground">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowHelp(false)}>
                  Fermer
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Full winner screen when operator clicked "Arrêter" */}
        {status === "finished" && winner.length > 0 && (
          <div className="absolute inset-0 z-20 bg-yellow-500/10 flex items-center justify-center rounded-lg">
            <div className="text-center space-y-6 px-6">
              <div className="animate-bounce">
                <Trophy className="w-20 h-20 sm:w-28 sm:h-28 text-yellow-500 mx-auto drop-shadow-lg" />
              </div>
              <h2 className="text-5xl sm:text-7xl font-extrabold text-yellow-500 tracking-tight drop-shadow-md animate-pulse">
                {winner.length > 1 ? "GAGNANTS" : "GAGNANT"}
              </h2>
              <div className="space-y-2">
                {winner.map((w) => (
                  <div key={w.cardId}>
                    <p className="text-3xl sm:text-5xl font-mono font-bold text-foreground">
                      {w.serialNumber}
                    </p>
                    <p className="text-base sm:text-lg text-muted-foreground">
                      {w.foundCount}/{w.totalCount} numéros
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 pt-4 max-w-xs mx-auto">
                <Button size="lg" className="w-full text-lg h-16 font-bold" onClick={handleStartNewGame} disabled={startingNew}>
                  <Sparkles className="w-6 h-6 mr-2" /> Nouvelle partie
                </Button>
                <Button variant="outline" size="lg" className="w-full text-base h-14" onClick={() => { setStatus("running"); setWinner([]) }}>
                  <ArrowRight className="w-5 h-5 mr-2" /> Continuer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Winner banner — non-blocking, full width */}
        {winner.length > 0 && status !== "finished" && (
          <div className="rounded-xl border-2 border-yellow-500 bg-yellow-500/20 p-4 sm:p-5 flex items-center gap-4 animate-glow-pulse shadow-lg shadow-yellow-500/20">
            <Trophy className="w-10 h-10 sm:w-14 sm:h-14 text-yellow-500 shrink-0 drop-shadow" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-yellow-500 uppercase tracking-wider text-sm sm:text-base">
                {winner.length > 1 ? `Cartons pleins (×${winner.length})` : "Carton plein"}
              </p>
              <p className="font-mono text-lg sm:text-xl font-bold">
                {winner.map(w => w.serialNumber).join(", ")}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button className="h-12 px-4 text-sm font-bold" variant="default" onClick={() => { engine?.continueGame(); setWinner([]) }}>
                Continuer
              </Button>
              <Button className="h-12 px-4 text-sm font-bold" variant="destructive" onClick={() => { engine?.continueGame(); setStatus("finished") }}>
                Arrêter
              </Button>
            </div>
          </div>
        )}

        {/* Two-column layout on md+ */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Left column — grid + controls */}
          <div className="md:w-[60%] flex flex-col gap-3 min-w-0 overflow-y-auto">
            {/* Last number + counts */}
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tirés</p>
                <p className="text-lg font-bold tabular-nums">{drawnNumbers.length}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className={`text-4xl sm:text-5xl font-bold tabular-nums transition-all duration-150 ${lastNumber ? "text-primary scale-100" : "text-muted-foreground/30 scale-95"}`}>
                  {lastNumber ? String(lastNumber).padStart(2, "0") : "—"}
                </div>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Restants</p>
                <p className="text-lg font-bold tabular-nums text-muted-foreground">{MAX_NUMBER - drawnNumbers.length}</p>
              </div>
            </div>

            {/* Mini history — last numbers in order */}
            {drawnNumbers.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center">
                {drawnNumbers.slice(-10).map((n, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-[10px] font-mono font-bold ${
                      i === drawnNumbers.slice(-10).length - 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {String(n).padStart(2, "0")}
                  </span>
                ))}
              </div>
            )}

            {/* Number grid — 1 to MAX_NUMBER, tap to draw */}
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: MAX_NUMBER }, (_, i) => {
                const num = i + 1
                const drawn = drawnNumbers.includes(num)
                const isLast = num === lastNumber
                const row = Math.floor((num - 1) / 10)
                const banded = row % 2 === 1
                return (
                  <button
                    key={num}
                    type="button"
                    className={`
                      min-h-11 rounded
                      text-sm font-mono font-bold
                      transition-all duration-100 active:scale-90
                      flex items-center justify-center
                      touch-manipulation select-none cursor-pointer
                      w-full
                      ${drawn
                        ? isLast
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/40 scale-110 z-10"
                          : "bg-muted-foreground/15 text-muted-foreground/50"
                        : `${banded ? "bg-muted/20" : "bg-card"} border border-border text-foreground hover:shadow-sm hover:border-primary active:bg-accent shadow-sm`
                      }
                    `}
                    onClick={() => {
                      if (!drawn) {
                        handleDraw(num)
                      } else if (isLast) {
                        handleUndo()
                      } else {
                        handleUnDraw(num)
                      }
                    }}
                    aria-label={drawn ? `Numéro ${num} (taper pour retirer)` : `Numéro ${num}`}
                  >
                    {num}
                  </button>
                )
              })}
            </div>

            {/* Bottom controls */}
            <div className="flex gap-2 items-center">
              <Button variant="outline" className="h-11 flex-1 text-sm" onClick={handleUndo} disabled={drawnNumbers.length === 0}>
                <Undo2 className="w-4 h-4 mr-1.5" /> Annuler
              </Button>
              <Button variant="outline" className="h-11 flex-1 text-sm" onClick={togglePause}>
                <Pause className="w-4 h-4 mr-1.5" /> Pause
              </Button>
            </div>
          </div>

          {/* Right column — per-card number grids */}
          <div className="md:w-[40%] flex flex-col min-h-0 overflow-hidden">
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium shrink-0">CARTONS</p>
            <div className="flex-1 overflow-y-auto min-h-0">
              {topCards.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">En attente des tirages...</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 p-0.5">
                  {topCards.map((card, i) => {
                    const cardNumbers = engine?.getCardNumbers(card.cardId) ?? []
                    const isWinner = winner.some(w => w.cardId === card.cardId)
                    return (
                      <div
                        key={card.cardId}
                        className={`rounded border px-1.5 py-1 ${
                          isWinner ? "border-yellow-500/60 bg-yellow-500/10" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={`text-[10px] font-bold w-3 text-center shrink-0 ${isWinner ? "text-yellow-500" : "text-muted-foreground"}`}>
                              {i + 1}
                            </span>
                            <span className={`font-mono text-[10px] truncate ${isWinner ? "font-bold text-yellow-500" : ""}`}>
                              {card.serialNumber}
                            </span>
                          </div>
                          <span className={`text-[10px] tabular-nums font-bold shrink-0 ml-1 ${isWinner ? "text-yellow-500" : "text-muted-foreground"}`}>
                            {card.foundCount}/{card.totalCount}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-px">
                          {cardNumbers.map((num) => {
                            const drawn = drawnNumbers.includes(num)
                            return (
                              <button
                                key={num}
                                type="button"
                              onClick={() => {
                                if (!drawn) handleDraw(num)
                                else handleUnDraw(num)
                              }}
                              className={`flex items-center justify-center aspect-square rounded-sm text-[10px] font-mono font-bold transition-all duration-100 active:scale-90 touch-manipulation select-none cursor-pointer ${
                                drawn
                                  ? "bg-muted-foreground/15 text-muted-foreground/50 line-through hover:bg-destructive/20 hover:text-destructive"
                                  : "bg-primary/10 text-primary hover:bg-primary/20 hover:shadow-sm"
                              }`}
                              aria-label={drawn ? `Numéro ${num} (taper pour retirer)` : `Numéro ${num}`}
                              >
                                {String(num).padStart(2, "0")}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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
