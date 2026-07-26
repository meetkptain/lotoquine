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
  private _lastWinners: CardRanking[] = []

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
    const winners = this.detector.findAllWinners(topCards, this.dismissedWinners)

    if (winners.length > 0) {
      this._lastWinners = winners
    }

    return {
      number,
      position,
      topCards,
      winners,
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

    this._lastWinners = []

    const topCards = this.calculator.getTopCards()

    return {
      number: lastNumber,
      position: this.drawnNumbers.length + 1,
      topCards,
      winners: [],
    }
  }

  unDrawNumber(number: number): DrawResult {
    const idx = this.drawnNumbers.indexOf(number)
    if (idx === -1) throw new Error(`Numéro ${number} pas encore tiré`)

    this.drawnNumbers.splice(idx, 1)
    this.drawHistory.push(-number)

    const affectedCardIds = this.index.getCardIdsByNumber(number)
    this.calculator.unmarkNumber(affectedCardIds)

    this._lastWinners = []

    const topCards = this.calculator.getTopCards()
    const winners = this.detector.findAllWinners(topCards, this.dismissedWinners)

    if (winners.length > 0) {
      this._lastWinners = winners
    }

    return { number, position: idx + 1, topCards, winners }
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
    return {
      gameId: this.gameId,
      gameName: this.gameName,
      status: this.status,
      drawnNumbers: [...this.drawnNumbers],
      topCards: this.calculator.getTopCards(),
      winners: [...this._lastWinners],
      activeCardCount: this.index.getTotalCards(),
    }
  }

  getLastWinners(): CardRanking[] {
    return [...this._lastWinners]
  }

  clearLastWinners(): void {
    this._lastWinners = []
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
    for (const w of this._lastWinners) {
      this.dismissedWinners.add(w.cardId)
    }
    this._lastWinners = []
    this.status = "running"
  }

  isWinnerDismissed(cardId: number): boolean {
    return this.dismissedWinners.has(cardId)
  }

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