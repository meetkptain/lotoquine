import type { IGameCardRepository } from "../interfaces"
import { gamesCards } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"

type DbType = LibSQLDatabase<any>

export class DrizzleGameCardRepository implements IGameCardRepository {
  constructor(private db: DbType) {}

  async addCardsToGame(gameId: number, cardIds: number[]): Promise<void> {
    const values = cardIds.map((cardId) => ({ gameId, cardId }))
    await this.db.insert(gamesCards).values(values)
  }

  async getCardIdsForGame(gameId: number): Promise<number[]> {
    const rows = await this.db
      .select()
      .from(gamesCards)
      .where(eq(gamesCards.gameId, gameId))
    return rows.map((r: any) => r.cardId ?? r.card_id)
  }

  async removeAllFromGame(gameId: number): Promise<void> {
    await this.db.delete(gamesCards).where(eq(gamesCards.gameId, gameId))
  }
}
