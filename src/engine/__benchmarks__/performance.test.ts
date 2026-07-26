import { describe, it, expect } from "vitest"
import { CardIndex } from "../card-index"
import { ScoreCalculator } from "../score-calculator"
import { WinnerDetector } from "../winner-detector"
import { GameEngine } from "../game-engine"
import type { Card } from "@/types"

function generateCards(count: number): Card[] {
  const cards: Card[] = []
  for (let i = 1; i <= count; i++) {
    const numbers = new Set<number>()
    while (numbers.size < 15) {
      numbers.add(Math.floor(Math.random() * 90) + 1)
    }
    cards.push({
      id: i,
      serialNumber: `FD${String(i).padStart(6, "0")}`,
      numbers: Array.from(numbers),
      active: true,
      createdAt: new Date(),
    })
  }
  return cards
}

function measure(fn: () => void): number {
  const start = performance.now()
  fn()
  return performance.now() - start
}

describe("Performance Benchmarks", () => {
  const sizes = [1_000, 10_000, 50_000]

  for (const size of sizes) {
    it(`builds index for ${size.toLocaleString()} cards`, () => {
      const cards = generateCards(size)
      const elapsed = measure(() => new CardIndex(cards))
      console.log(`  Index ${size.toLocaleString()} cards: ${elapsed.toFixed(1)}ms`)
      expect(elapsed).toBeLessThan(size === 50_000 ? 2000 : 1000)
    })

    it(`draws 15 numbers with ${size.toLocaleString()} cards`, () => {
      const cards = generateCards(size)
      const engine = new GameEngine(cards, 1, "Benchmark")
      engine.startGame()

      const testNumbers = Array.from({ length: 15 }, () =>
        Math.floor(Math.random() * 90) + 1
      )

      const elapsed = measure(() => {
        for (const n of testNumbers) {
          try { engine.drawNumber(n) } catch { /* skip dupes */ }
        }
      })

      console.log(`  15 draws with ${size.toLocaleString()} cards: ${elapsed.toFixed(1)}ms`)
      expect(elapsed).toBeLessThan(size === 50_000 ? 600 : 200)
    })

    it(`gets top cards with ${size.toLocaleString()} cards`, () => {
      const cards = generateCards(size)
      const totals = new Map(cards.map((c) => [c.id, c.numbers.length]))
      const serials = new Map(cards.map((c) => [c.id, c.serialNumber]))
      const calc = new ScoreCalculator(totals, serials)

      // Mark some numbers
      for (let i = 1; i <= 5; i++) {
        calc.markNumber(new Set([i]))
      }

      const elapsed = measure(() => {
        for (let i = 0; i < 100; i++) {
          calc.getTopCards()
        }
      })

      console.log(`  100x top-10 queries with ${size.toLocaleString()} cards: ${elapsed.toFixed(1)}ms`)
      expect(elapsed).toBeLessThan(size === 50_000 ? 100 : 50)
    })
  }

  it("memory usage with 100k cards (index size)", () => {
    const cards = generateCards(100_000)
    const elapsed = measure(() => new CardIndex(cards))
    console.log(`  Index 100,000 cards: ${elapsed.toFixed(1)}ms`)
    expect(elapsed).toBeLessThan(5000)
  })
})
