import "server-only"

import type {
  IGameRepository,
  ICardRepository,
  IDrawRepository,
  IGameCardRepository,
  ICardProgressRepository,
} from "@/repositories/interfaces"
import { GameEngine } from "@/engine"
import type { Card, Game, CreateGameDTO } from "@/types"
import { GameNotFoundError, GameNotRunningError, GameNotWaitingError, CardNotFoundError } from "@/lib/errors"

export interface StartGameResult {
  game: Game
  engine: GameEngine
}

export async function startGame(
  gameRepo: IGameRepository,
  cardRepo: ICardRepository,
  gameCardRepo: IGameCardRepository,
  progressRepo: ICardProgressRepository,
  gameId: number
): Promise<StartGameResult> {
  const game = await gameRepo.findById(gameId)
  if (!game) throw new GameNotFoundError(gameId)
  if (game.status !== "WAITING") throw new GameNotWaitingError(gameId)

  const cardIds = await gameCardRepo.getCardIdsForGame(gameId)
  const cardsData: Card[] = []

  for (const cardId of cardIds) {
    const card = await cardRepo.findById(cardId)
    if (card) {
      const numbers = await getCardNumbers(cardId)
      cardsData.push({ ...card, numbers })
    }
  }

  const engine = new GameEngine(cardsData, gameId, game.name)
  engine.startGame()

  await gameRepo.startGame(gameId)

  return { game, engine }
}

async function getCardNumbers(cardId: number): Promise<number[]> {
  const { cardNumbers } = await import("@/db/schema")
  const { getDb } = await import("@/db/client")
  const { eq } = await import("drizzle-orm")
  const db = getDb()
  const rows = await db
    .select()
    .from(cardNumbers)
    .where(eq(cardNumbers.cardId, cardId))
  return rows.map((r: any) => r.number)
}

export async function drawNumber(
  gameRepo: IGameRepository,
  drawRepo: IDrawRepository,
  progressRepo: ICardProgressRepository,
  engine: GameEngine,
  number: number
) {
  const result = engine.drawNumber(number)
  const gameId = engine.getGameId()

  await drawRepo.add(gameId, number, result.position)

  if (result.winner) {
    await gameRepo.finishGame(gameId, result.winner.cardId)
  }

  return result
}

export async function undoLastDraw(
  gameRepo: IGameRepository,
  drawRepo: IDrawRepository,
  engine: GameEngine
) {
  const result = engine.undoLastDraw()

  if (result) {
    const deleted = await drawRepo.deleteLastDraw(engine.getGameId())
  }

  return result
}

export async function createGame(
  gameRepo: IGameRepository,
  gameCardRepo: IGameCardRepository,
  data: CreateGameDTO
): Promise<Game> {
  const game = await gameRepo.create(data)

  if (data.cardIds.length > 0) {
    await gameCardRepo.addCardsToGame(game.id, data.cardIds)
  }

  return game
}

export async function finishGame(
  gameRepo: IGameRepository,
  engine: GameEngine
): Promise<void> {
  const state = engine.getState()
  if (state.winner) {
    await gameRepo.finishGame(engine.getGameId(), state.winner.cardId)
  }
}

export async function resumeGame(
  gameRepo: IGameRepository,
  cardRepo: ICardRepository,
  gameCardRepo: IGameCardRepository,
  drawRepo: IDrawRepository,
  progressRepo: ICardProgressRepository,
  gameId: number
): Promise<{ engine: GameEngine; drawnNumbers: number[] } | null> {
  const game = await gameRepo.findById(gameId)
  if (!game || game.status !== "RUNNING") return null

  const existingDraws = await drawRepo.findByGame(gameId)
  const drawnNumbers = existingDraws.map((d) => d.number)

  const { game: _, engine } = await startGame(
    gameRepo, cardRepo, gameCardRepo, progressRepo, gameId
  )

  for (const num of drawnNumbers) {
    try {
      engine.drawNumber(num)
    } catch {
      // skip duplicates on resume
    }
  }

  return { engine, drawnNumbers }
}
