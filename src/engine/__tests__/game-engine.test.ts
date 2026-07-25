import { describe, it, expect } from "vitest"
import { CardIndex } from "../card-index"
import { ScoreCalculator } from "../score-calculator"
import { WinnerDetector } from "../winner-detector"
import { GameEngine } from "../game-engine"
import type { Card } from "@/types"

function makeCard(id: number, serial: string, numbers: number[], active = true): Card {
  return { id, serialNumber: serial, numbers, active, createdAt: new Date() }
}

describe("CardIndex", () => {
  it("builds index from cards", () => {
    const cards = [
      makeCard(1, "FD000001", [12, 45, 67]),
      makeCard(2, "FD000002", [45, 89]),
    ]
    const index = new CardIndex(cards)
    expect(index.getCardIdsByNumber(45)).toEqual(new Set([1, 2]))
    expect(index.getCardIdsByNumber(12)).toEqual(new Set([1]))
    expect(index.getCardIdsByNumber(99)).toEqual(new Set())
    expect(index.getTotalCards()).toBe(2)
  })

  it("skips inactive cards", () => {
    const cards = [
      makeCard(1, "FD000001", [12, 45], true),
      makeCard(2, "FD000002", [45], false),
    ]
    const index = new CardIndex(cards)
    expect(index.getCardIdsByNumber(45)).toEqual(new Set([1]))
    expect(index.getTotalCards()).toBe(1)
  })
})

describe("ScoreCalculator", () => {
  it("marks found numbers and returns top cards", () => {
    const totals = new Map([[1, 3], [2, 3]])
    const serials = new Map([[1, "FD000001"], [2, "FD000002"]])
    const calc = new ScoreCalculator(totals, serials)

    calc.markNumber(new Set([1, 2]))
    expect(calc.getFoundCount(1)).toBe(1)
    expect(calc.getFoundCount(2)).toBe(1)

    calc.markNumber(new Set([1]))
    const top = calc.getTopCards()
    expect(top[0].cardId).toBe(1)
    expect(top[0].foundCount).toBe(2)
    expect(top[1].foundCount).toBe(1)
  })

  it("supports undo via unmarkNumber", () => {
    const totals = new Map([[1, 3]])
    const serials = new Map([[1, "FD000001"]])
    const calc = new ScoreCalculator(totals, serials)

    calc.markNumber(new Set([1]))
    calc.markNumber(new Set([1]))
    expect(calc.getFoundCount(1)).toBe(2)

    calc.unmarkNumber(new Set([1]))
    expect(calc.getFoundCount(1)).toBe(1)
  })
})

describe("WinnerDetector", () => {
  it("detects a winner when foundCount >= totalCount", () => {
    const detector = new WinnerDetector()
    expect(detector.checkWinner(1, 3, 3)).toBe(true)
    expect(detector.checkWinner(1, 2, 3)).toBe(false)
  })

  it("finds winner in list", () => {
    const detector = new WinnerDetector()
    const candidates = [
      { cardId: 1, serialNumber: "FD000001", foundCount: 2, totalCount: 3 },
      { cardId: 2, serialNumber: "FD000002", foundCount: 3, totalCount: 3 },
    ]
    const winner = detector.findWinner(candidates)
    expect(winner).not.toBeNull()
    expect(winner!.cardId).toBe(2)
  })

  it("returns null when no winner", () => {
    const detector = new WinnerDetector()
    const candidates = [
      { cardId: 1, serialNumber: "FD000001", foundCount: 2, totalCount: 3 },
    ]
    expect(detector.findWinner(candidates)).toBeNull()
  })
})

describe("GameEngine", () => {
  function createEngine(): GameEngine {
    const cards = [
      makeCard(1, "FD000001", [10, 20, 30]),
      makeCard(2, "FD000002", [40, 50, 60]),
    ]
    return new GameEngine(cards, 1, "Test Game")
  }

  it("starts and accepts draws", () => {
    const engine = createEngine()
    engine.startGame()
    const result = engine.drawNumber(10)

    expect(result.number).toBe(10)
    expect(result.position).toBe(1)
    expect(result.winner).toBeNull()
    expect(engine.getDrawnNumbers()).toEqual([10])
  })

  it("rejects duplicate numbers", () => {
    const engine = createEngine()
    engine.startGame()
    engine.drawNumber(10)
    expect(() => engine.drawNumber(10)).toThrow()
  })

  it("rejects invalid numbers", () => {
    const engine = createEngine()
    engine.startGame()
    expect(() => engine.drawNumber(0)).toThrow()
    expect(() => engine.drawNumber(91)).toThrow()
    expect(() => engine.drawNumber(-1)).toThrow()
  })

  it("detects winner when all numbers found", () => {
    const engine = createEngine()
    engine.startGame()
    engine.drawNumber(10)
    engine.drawNumber(20)
    const result = engine.drawNumber(30)

    expect(result.winner).not.toBeNull()
    expect(result.winner!.cardId).toBe(1)
    expect(result.winner!.foundCount).toBe(3)
    expect(engine.isFinished()).toBe(false)
  })

  it("supports undo", () => {
    const engine = createEngine()
    engine.startGame()
    engine.drawNumber(10)
    engine.drawNumber(20)

    const undoResult = engine.undoLastDraw()
    expect(undoResult).not.toBeNull()
    expect(undoResult!.number).toBe(20)
    expect(engine.getDrawnNumbers()).toEqual([10])
  })

  it("supports pause and resume", () => {
    const engine = createEngine()
    engine.startGame()
    engine.pause()
    expect(engine.getStatus()).toBe("paused")
    expect(() => engine.drawNumber(10)).toThrow()
    engine.resume()
    expect(engine.getStatus()).toBe("running")
    expect(() => engine.drawNumber(10)).not.toThrow()
  })

  it("returns correct game state", () => {
    const engine = createEngine()
    engine.startGame()
    engine.drawNumber(10)

    const state = engine.getState()
    expect(state.gameId).toBe(1)
    expect(state.gameName).toBe("Test Game")
    expect(state.status).toBe("running")
    expect(state.drawnNumbers).toEqual([10])
    expect(state.activeCardCount).toBe(2)
  })
})
