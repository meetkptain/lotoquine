import type { CardRanking } from "@/types"

export class WinnerDetector {
  checkWinner(cardId: number, foundCount: number, totalCount: number): boolean {
    return foundCount >= totalCount
  }

  findAllWinners(candidates: CardRanking[], dismissedIds?: Set<number>): CardRanking[] {
    const result: CardRanking[] = []
    for (const c of candidates) {
      if (c.foundCount >= c.totalCount && !dismissedIds?.has(c.cardId)) {
        result.push(c)
      }
    }
    return result
  }
}