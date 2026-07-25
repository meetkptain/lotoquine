import type { CardRanking } from "@/types"

export class WinnerDetector {
  checkWinner(cardId: number, foundCount: number, totalCount: number): boolean {
    return foundCount >= totalCount
  }

  findWinner(candidates: CardRanking[]): CardRanking | null {
    for (const c of candidates) {
      if (c.foundCount >= c.totalCount) {
        return c
      }
    }
    return null
  }
}
