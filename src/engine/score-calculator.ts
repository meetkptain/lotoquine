import type { CardRanking } from "@/types"

export class ScoreCalculator {
  private scores: Map<number, number>
  private totalCounts: Map<number, number>
  private cardSerials: Map<number, string>

  constructor(totalCounts: Map<number, number>, cardSerials: Map<number, string>) {
    this.scores = new Map()
    this.totalCounts = totalCounts
    this.cardSerials = cardSerials
    for (const [cardId] of totalCounts) {
      this.scores.set(cardId, 0)
    }
  }

  getFoundCount(cardId: number): number {
    return this.scores.get(cardId) ?? 0
  }

  getRemainingCount(cardId: number): number {
    const total = this.totalCounts.get(cardId) ?? 0
    const found = this.getFoundCount(cardId)
    return total - found
  }

  getProgress(cardId: number): number {
    const total = this.totalCounts.get(cardId) ?? 1
    const found = this.getFoundCount(cardId)
    return Math.round((found / total) * 100)
  }

  markNumber(cardIds: Set<number>): void {
    for (const cardId of cardIds) {
      const current = this.scores.get(cardId) ?? 0
      this.scores.set(cardId, current + 1)
    }
    this.dirty = true
  }

  unmarkNumber(cardIds: Set<number>): void {
    for (const cardId of cardIds) {
      const current = this.scores.get(cardId) ?? 0
      if (current > 0) {
        this.scores.set(cardId, current - 1)
      }
    }
    this.dirty = true
  }

  private dirty = true
  private cachedTop: CardRanking[] = []

  getTopCards(limit: number): CardRanking[] {
    if (!this.dirty && this.cachedTop.length === limit) {
      return this.cachedTop
    }

    const entries: CardRanking[] = []
    for (const [cardId, foundCount] of this.scores) {
      if (foundCount === 0) continue
      const totalCount = this.totalCounts.get(cardId) ?? 0
      const serialNumber = this.cardSerials.get(cardId) ?? "UNKNOWN"
      entries.push({ cardId, serialNumber, foundCount, totalCount })
    }

    entries.sort((a, b) => {
      if (b.foundCount !== a.foundCount) return b.foundCount - a.foundCount
      return a.serialNumber.localeCompare(b.serialNumber)
    })

    this.cachedTop = entries.slice(0, limit)
    this.dirty = false
    return this.cachedTop
  }

  getTotalCount(cardId: number): number {
    return this.totalCounts.get(cardId) ?? 0
  }

  resetCard(cardId: number, newTotal: number): void {
    this.totalCounts.set(cardId, newTotal)
    this.scores.set(cardId, 0)
    this.dirty = true
  }

  forceMark(cardId: number): void {
    const current = this.scores.get(cardId) ?? 0
    this.scores.set(cardId, current + 1)
    this.dirty = true
  }

  getCardSerials(): Map<number, string> {
    return this.cardSerials
  }

  getAllScores(): Map<number, number> {
    return new Map(this.scores)
  }
}
