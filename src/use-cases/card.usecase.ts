import "server-only"

import type { ICardRepository } from "@/repositories/interfaces"
import type { Card, CreateCardDTO, CsvCardRow } from "@/types"
import { CardNotFoundError, CardNotFoundBySerialError, CsvImportError } from "@/lib/errors"
import { validateCardNumbers, validateCsvRows } from "@/lib/validation"
import { NUMBERS_PER_CARD } from "@/lib/constants"

export async function importCards(
  cardRepo: ICardRepository,
  rows: CsvCardRow[]
): Promise<{ imported: number; errors: { line: number; message: string }[] }> {
  const { validCards, errors } = validateCsvRows(rows)

  if (validCards.length === 0) {
    throw new CsvImportError(errors)
  }

  const cards = await cardRepo.bulkCreate(validCards)
  const { db, cardNumbers } = await importDb()

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]
    const cardData = validCards[i]

    for (const number of cardData.numbers) {
      await db.insert(cardNumbers).values({
        cardId: card.id,
        number,
      })
    }
  }

  return { imported: validCards.length, errors }
}

async function importDb() {
  const { getDb } = await import("@/db/client")
  const { cardNumbers } = await import("@/db/schema")
  return { db: getDb(), cardNumbers }
}

export async function searchCards(
  cardRepo: ICardRepository,
  query: string
): Promise<Card[]> {
  if (!query.trim()) {
    return cardRepo.findActive()
  }
  return cardRepo.search(query)
}

export async function getCardById(
  cardRepo: ICardRepository,
  id: number
): Promise<Card> {
  const card = await cardRepo.findById(id)
  if (!card) throw new CardNotFoundError(id)
  const numbers = await getCardNumberArray(id)
  return { ...card, numbers }
}

export async function getCardBySerial(
  cardRepo: ICardRepository,
  serial: string
): Promise<Card> {
  const card = await cardRepo.findBySerialNumber(serial)
  if (!card) throw new CardNotFoundBySerialError(serial)
  const numbers = await getCardNumberArray(card.id)
  return { ...card, numbers }
}

async function getCardNumberArray(cardId: number): Promise<number[]> {
  const { getDb } = await import("@/db/client")
  const { cardNumbers } = await import("@/db/schema")
  const { eq } = await import("drizzle-orm")
  const db = getDb()
  const rows = await db
    .select()
    .from(cardNumbers)
    .where(eq(cardNumbers.cardId, cardId))
  return rows.map((r: any) => r.number)
}

export async function addCardManually(
  cardRepo: ICardRepository,
  data: CreateCardDTO
): Promise<Card> {
  validateCardNumbers(data.numbers)
  const card = await cardRepo.create(data)

  const { getDb } = await import("@/db/client")
  const { cardNumbers } = await import("@/db/schema")
  const db = getDb()

  for (const number of data.numbers) {
    await db.insert(cardNumbers).values({ cardId: card.id, number })
  }

  return { ...card, numbers: data.numbers }
}

export async function deleteCard(
  cardRepo: ICardRepository,
  id: number
): Promise<void> {
  await cardRepo.deactivate(id)
}

export async function getStats(cardRepo: ICardRepository): Promise<{
  total: number
  active: number
}> {
  const all = await cardRepo.findAll()
  return {
    total: all.length,
    active: all.filter((c) => c.active).length,
  }
}
