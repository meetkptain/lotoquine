"use server"

import { getContainer } from "@/di/container"
import type { CreateCardDTO, CsvCardRow, Game, Card } from "@/types"
import { cards as cardsTable, cardNumbers } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function createGameAction(name: string, cardIds: number[]): Promise<Game> {
  const { createGame } = await import("@/use-cases/game.usecase")
  const { gameRepo, gameCardRepo } = getContainer()
  return createGame(gameRepo, gameCardRepo, { name, cardIds })
}

export async function startGameAction(gameId: number) {
  const container = getContainer()
  const { gameRepo, cardRepo, gameCardRepo } = container

  const game = await gameRepo.findById(gameId)
  if (!game) throw new Error("Partie introuvable")

  const cardIds = await gameCardRepo.getCardIdsForGame(gameId)
  const cardsData: { id: number; serialNumber: string; numbers: number[]; active: boolean }[] = []

  for (const cardId of cardIds) {
    const card = await cardRepo.findById(cardId)
    if (!card) continue

    const { getDb } = await import("@/db/client")
    const db = getDb()
    const numberRows = await db
      .select()
      .from(cardNumbers)
      .where(eq(cardNumbers.cardId, cardId))
    const numbers = numberRows.map((r: any) => r.number ?? (r as any).number_val)

    cardsData.push({
      id: card.id,
      serialNumber: card.serialNumber,
      numbers,
      active: card.active,
    })
  }

  await gameRepo.startGame(gameId)

  return {
    game: await gameRepo.findById(gameId),
    cards: cardsData,
  }
}

export async function getCardsForGameAction(gameId: number) {
  const container = getContainer()
  const { cardRepo, gameCardRepo } = container

  const cardIds = await gameCardRepo.getCardIdsForGame(gameId)
  const cardsData: { id: number; serialNumber: string; numbers: number[]; active: boolean }[] = []

  for (const cardId of cardIds) {
    const card = await cardRepo.findById(cardId)
    if (!card) continue

    const { getDb } = await import("@/db/client")
    const db = getDb()
    const numberRows = await db
      .select()
      .from(cardNumbers)
      .where(eq(cardNumbers.cardId, cardId))
    const numbers = numberRows.map((r: any) => r.number ?? (r as any).number_val)

    cardsData.push({
      id: card.id,
      serialNumber: card.serialNumber,
      numbers,
      active: card.active,
    })
  }

  return cardsData
}

export async function getGamesAction(): Promise<Game[]> {
  const { gameRepo } = getContainer()
  return gameRepo.findAll()
}

export async function getGameAction(id: number): Promise<Game | null> {
  const { gameRepo } = getContainer()
  return gameRepo.findById(id)
}

export async function getCardsAction(): Promise<Card[]> {
  const { cardRepo } = getContainer()
  return cardRepo.findActive()
}

export async function searchCardsAction(query: string): Promise<Card[]> {
  const { cardRepo } = getContainer()
  return cardRepo.search(query)
}

export async function importCardsAction(rows: CsvCardRow[]): Promise<{
  imported: number
  errors: { line: number; message: string }[]
}> {
  const { importCards } = await import("@/use-cases/card.usecase")
  const { cardRepo } = getContainer()
  return importCards(cardRepo, rows)
}

export async function addCardAction(data: CreateCardDTO): Promise<Card> {
  const { addCardManually } = await import("@/use-cases/card.usecase")
  const { cardRepo } = getContainer()
  return addCardManually(cardRepo, data)
}

export async function deleteCardAction(id: number): Promise<void> {
  const { deleteCard } = await import("@/use-cases/card.usecase")
  const { cardRepo } = getContainer()
  return deleteCard(cardRepo, id)
}

export async function getCardWithNumbersAction(id: number): Promise<{
  id: number
  serialNumber: string
  numbers: number[]
  active: boolean
} | null> {
  const { cardRepo } = getContainer()
  const card = await cardRepo.findById(id)
  if (!card) return null

  const { getDb } = await import("@/db/client")
  const db = getDb()
  const numberRows = await db
    .select()
    .from(cardNumbers)
    .where(eq(cardNumbers.cardId, id))
  const numbers = numberRows.map((r: any) => r.number ?? (r as any).number_val)

  return { id: card.id, serialNumber: card.serialNumber, numbers, active: card.active }
}

export async function updateCardAction(
  id: number,
  data: { serialNumber?: string; numbers?: number[] }
): Promise<void> {
  const container = getContainer()
  const { cardRepo } = container
  const { getDb } = await import("@/db/client")
  const db = getDb()

  if (data.serialNumber) {
    await db.update(cardsTable).set({ serialNumber: data.serialNumber }).where(eq(cardsTable.id, id))
  }

  if (data.numbers) {
    // Delete old numbers, insert new ones
    await db.delete(cardNumbers).where(eq(cardNumbers.cardId, id))
    for (const num of data.numbers) {
      await db.insert(cardNumbers).values({ cardId: id, number: num })
    }
  }
}

export async function getCardStatsAction(): Promise<{ total: number; active: number }> {
  const { getStats } = await import("@/use-cases/card.usecase")
  const { cardRepo } = getContainer()
  return getStats(cardRepo)
}

export async function getDrawnNumbersAction(gameId: number): Promise<number[]> {
  const { drawRepo } = getContainer()
  const draws = await drawRepo.findByGame(gameId)
  return draws.map((d) => d.number).filter((n): n is number => n != null)
}

export async function saveDrawnNumbersAction(
  gameId: number,
  drawnNumbers: number[],
  winnerCardId: number | null
): Promise<void> {
  const { drawRepo, progressRepo, gameRepo } = getContainer()

  const existing = await drawRepo.findByGame(gameId)
  const existingSet = new Set(existing.map((d) => d.number))

  for (let i = 0; i < drawnNumbers.length; i++) {
    const num = drawnNumbers[i]
    if (!existingSet.has(num)) {
      await drawRepo.add(gameId, num, i + 1)
    }
  }

  if (winnerCardId) {
    await gameRepo.finishGame(gameId, winnerCardId)
  }
}
