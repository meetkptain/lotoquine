"use server"

import { getContainer } from "@/di/container"
import type { CreateCardDTO, CsvCardRow, Game, Card } from "@/types"
import { cards as cardsTable, cardNumbers, winners } from "@/db/schema"
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

export async function createAndStartGameAction(): Promise<{ game: Game; cards: { id: number; serialNumber: string; numbers: number[]; active: boolean }[] }> {
  const container = getContainer()
  const { gameRepo, gameCardRepo, cardRepo } = container
  const { createGame } = await import("@/use-cases/game.usecase")

  const activeCards = await cardRepo.findActive()
  const cardIds = activeCards.map((c) => c.id)

  const name = `Partie ${new Date().toLocaleDateString("fr-FR")} ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
  const game = await createGame(gameRepo, gameCardRepo, { name, cardIds })

  const started = await startGameAction(game.id)
  if (!started.game) throw new Error("Erreur au démarrage de la partie")
  return started as { game: Game; cards: { id: number; serialNumber: string; numbers: number[]; active: boolean }[] }
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
): Promise<void> {
  const { drawRepo, progressRepo } = getContainer()

  const existing = await drawRepo.findByGame(gameId)
  const existingSet = new Set(existing.map((d) => d.number))

  for (let i = 0; i < drawnNumbers.length; i++) {
    const num = drawnNumbers[i]
    if (!existingSet.has(num)) {
      await drawRepo.add(gameId, num, i + 1)
    }
  }
}

export async function acknowledgeWinnersAction(gameId: number, cardIds: number[]) {
  const { getDb } = await import("@/db/client")
  const db = getDb()
  const values = cardIds.map((cardId) => ({
    gameId,
    cardId,
    createdAt: new Date().toISOString(),
  }))
  await db.insert(winners).values(values)
}

export async function getAcknowledgedWinnersAction(gameId: number): Promise<number[]> {
  const { getDb } = await import("@/db/client")
  const db = getDb()
  const rows = await db.select().from(winners).where(eq(winners.gameId, gameId))
  return rows.map((r) => r.cardId)
}

export async function finishGameAction(gameId: number): Promise<void> {
  const { gameRepo } = getContainer()
  await gameRepo.updateStatus(gameId, "FINISHED")
}

function parseTursoUrl(url: string): { dbName: string; branch: string; org: string } {
  const clean = url.replace(/^libsql:\/\//, "").split(".")[0]
  const hasDoubleDash = clean.includes("--")
  if (hasDoubleDash) {
    const [dbName, rest] = clean.split("--")
    const parts = rest.split("-")
    const org = parts[parts.length - 1] ?? ""
    const branch = parts.slice(0, -1).join("-") || "main"
    return { dbName, branch, org }
  }
  const parts = clean.split("-")
  const org = parts[parts.length - 1] ?? ""
  const dbName = parts.slice(0, -1).join("-") || clean
  return { dbName, branch: "main", org }
}

export async function getDbInfoAction() {
  const rawUrl = process.env.TURSO_DB_URL ?? process.env.TURSO_DATABASE_URL ?? ""
  const hasAuth = !!(process.env.TURSO_DB_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN)
  const parsed = rawUrl ? parseTursoUrl(rawUrl) : null
  return {
    url: rawUrl.replace(/\/\/[^@]+@/, "//***@"),
    masked: rawUrl.replace(/authToken=[^&]+/, "authToken=***"),
    configured: !!rawUrl,
    hasAuth,
    dbName: parsed?.dbName ?? "",
    branch: parsed?.branch ?? "",
    org: parsed?.org ?? "",
  }
}
