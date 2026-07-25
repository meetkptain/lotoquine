import type { Card } from "@/types"

export class CardIndex {
  private index: Map<number, Set<number>>
  private cardTotalNumbers: Map<number, number>

  constructor(cards: Card[]) {
    this.index = new Map()
    this.cardTotalNumbers = new Map()

    for (const card of cards) {
      if (!card.active) continue
      this.cardTotalNumbers.set(card.id, card.numbers.length)

      for (const num of card.numbers) {
        let cardSet = this.index.get(num)
        if (!cardSet) {
          cardSet = new Set()
          this.index.set(num, cardSet)
        }
        cardSet.add(card.id)
      }
    }
  }

  getCardIdsByNumber(number: number): Set<number> {
    return this.index.get(number) ?? new Set()
  }

  getNumbersForCard(cardId: number): number[] {
    const nums: number[] = []
    for (const [num, cardIds] of this.index.entries()) {
      if (cardIds.has(cardId)) nums.push(num)
    }
    return nums
  }

  getTotalCards(): number {
    return this.cardTotalNumbers.size
  }

  getTotalNumbers(cardId: number): number {
    return this.cardTotalNumbers.get(cardId) ?? 0
  }

  hasCard(cardId: number): boolean {
    return this.cardTotalNumbers.has(cardId)
  }

  reloadCardNumbers(cardId: number, oldNumbers: number[], newNumbers: number[]): void {
    // Remove old numbers from index
    for (const num of oldNumbers) {
      const cardSet = this.index.get(num)
      if (cardSet) {
        cardSet.delete(cardId)
        if (cardSet.size === 0) this.index.delete(num)
      }
    }
    // Add new numbers to index
    for (const num of newNumbers) {
      let cardSet = this.index.get(num)
      if (!cardSet) {
        cardSet = new Set()
        this.index.set(num, cardSet)
      }
      cardSet.add(cardId)
    }
    this.cardTotalNumbers.set(cardId, newNumbers.length)
  }
}
