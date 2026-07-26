import type { Card, CardRanking, DrawResult, GameState } from "@/types"
import { CardIndex } from "./card-index"
import { ScoreCalculator } from "./score-calculator"
import { WinnerDetector } from "./winner-detector"
import { InvalidNumberError, DuplicateDrawError, NoDrawToUndoError } from "@/lib/errors"
import { MIN_NUMBER, MAX_NUMBER } from "@/lib/constants"

type EngineStatus = "idle" | "running" | "finished" | "paused"

export class GameEngine {
  private index: CardIndex
  private calculator: ScoreCalculator
  private detector: WinnerDetector
  private drawnNumbers: number[]
  private status: EngineStatus
  private gameId: number
  private gameName: string
  private drawHistory: number[]
  private dismissedWinners: Set<number>
  private _lastWinner: CardRanking | null = null

  constructor(cards: Card[], gameId: number, gameName: string) {
    this.gameId = gameId
    this.gameName = gameName
    this.index = new CardIndex(cards)
    this.drawHistory = []

    const totalCounts = new Map<number, number>()
    const cardSerials = new Map<number, string>()
    for (const card of cards) {
      if (card.active) {
        totalCounts.set(card.id, card.numbers.length)
        cardSerials.set(card.id, card.serialNumber)
      }
    }

    this.calculator = new ScoreCalculator(totalCounts, cardSerials)
    this.detector = new WinnerDetector()
    this.drawnNumbers = []
    this.status = "idle"
    this.dismissedWinners = new Set()
  }

  startGame(): void {
    this.status = "running"
  }

  drawNumber(number: number): DrawResult {
    if (this.status !== "running") {
      throw new Error("La partie n'est pas en cours")
    }

    if (!Number.isInteger(number) || number < MIN_NUMBER || number > MAX_NUMBER) {
      throw new InvalidNumberError(number)
    }

    if (this.drawnNumbers.includes(number)) {
      throw new DuplicateDrawError(number, this.gameId)
    }

    this.drawnNumbers.push(number)
    this.drawHistory.push(number)

    const affectedCardIds = this.index.getCardIdsByNumber(number)
    this.calculator.markNumber(affectedCardIds)

    const position = this.drawnNumbers.length
    const topCards = this.calculator.getTopCards()
    const winner = this.detector.findWinner(topCards)

    // Record winner but NEVER stop the game automatically.
    // The operator decides when to stop (via "Arrêter" button).
    // Dismissed winners (from continueGame) are still returned so the UI can show them,
    // but the engine keeps running.
    if (winner && !this.dismissedWinners.has(winner.cardId)) {
      this._lastWinner = winner
    }

    return {
      number,
      position,
      topCards,
      winner,
    }
  }

  undoLastDraw(): DrawResult | null {
    if (this.drawnNumbers.length === 0) {
      throw new NoDrawToUndoError(this.gameId)
    }

    this.status = "running"

    const lastNumber = this.drawnNumbers.pop()!
    this.drawHistory.push(-lastNumber)

    const affectedCardIds = this.index.getCardIdsByNumber(lastNumber)
    this.calculator.unmarkNumber(affectedCardIds)

    // Clear last winner — undo might have fixed it
    this._lastWinner = null

    const topCards = this.calculator.getTopCards()
    const winner = null

    return {
      number: lastNumber,
      position: this.drawnNumbers.length + 1,
      topCards,
      winner,
    }
  }

  /**
   * Remove any drawn number (not just the last one).
   * Handles tapping a drawn number on the grid or card to un-draw it.
   */
  unDrawNumber(number: number): DrawResult {
    const idx = this.drawnNumbers.indexOf(number)
    if (idx === -1) throw new Error(`Numéro ${number} pas encore tiré`)

    this.drawnNumbers.splice(idx, 1)
    this.drawHistory.push(-number)

    const affectedCardIds = this.index.getCardIdsByNumber(number)
    this.calculator.unmarkNumber(affectedCardIds)

    this._lastWinner = null

    const topCards = this.calculator.getTopCards()
    const winner = this.detector.findWinner(topCards)

    if (winner && !this.dismissedWinners.has(winner.cardId)) {
      this._lastWinner = winner
    }

    return { number, position: idx + 1, topCards, winner }
  }

  pause(): void {
    if (this.status === "running") {
      this.status = "paused"
    }
  }

  resume(): void {
    if (this.status === "paused") {
      this.status = "running"
    }
  }

  getState(): GameState {
    const winner = this._lastWinner
    return {
      gameId: this.gameId,
      gameName: this.gameName,
      status: this.status,
      drawnNumbers: [...this.drawnNumbers],
      topCards: this.calculator.getTopCards(),
      winner,
      activeCardCount: this.index.getTotalCards(),
    }
  }

  getLastWinner(): CardRanking | null {
    return this._lastWinner
  }

  clearLastWinner(): void {
    this._lastWinner = null
  }

  getDrawnNumbers(): number[] {
    return [...this.drawnNumbers]
  }

  getTopCards(): CardRanking[] {
    return this.calculator.getTopCards()
  }

  getCardNumbers(cardId: number): number[] {
    return this.index.getNumbersForCard(cardId)
  }

  continueGame(): void {
    // Dismiss the current winner — the card stays in the game but won't be
    // highlighted as winner anymore. The engine keeps running.
    if (this._lastWinner) {
      this.dismissedWinners.add(this._lastWinner.cardId)
      this._lastWinner = null
    }
    this.status = "running"
  }

  isWinnerDismissed(cardId: number): boolean {
    return this.dismissedWinners.has(cardId)
  }

  /**
   * Replace a card's numbers mid-game (after correcting a data entry error).
   * Updates the inverted index, recalculates found count from current draws.
   */
  reloadCard(cardId: number, newNumbers: number[]): void {
    const oldTotal = this.calculator.getTotalCount(cardId)
    if (oldTotal === 0) return

    const oldNumbers = this.index.getNumbersForCard(cardId)
    this.index.reloadCardNumbers(cardId, oldNumbers, newNumbers)

    this.calculator.resetCard(cardId, newNumbers.length)
    for (const num of this.drawnNumbers) {
      if (newNumbers.includes(num)) {
        this.calculator.forceMark(cardId)
      }
    }
  }

  getStatus(): EngineStatus {
    return this.status
  }

  isFinished(): boolean {
    return this.status === "finished"
  }

  getGameId(): number {
    return this.gameId
  }

  getGameName(): string {
    return this.gameName
  }
}
