import type { CardProgress } from "@/types"
import type { ICardProgressRepository } from "../interfaces"
import { cardProgress } from "@/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"

type DbType = LibSQLDatabase<any>

export class DrizzleCardProgressRepository implements ICardProgressRepository {
  constructor(private db: DbType) {}

  async upsert(gameId: number, cardId: number, foundCount: number): Promise<void> {
    await this.db
      .insert(cardProgress)
      .values({
        gameId,
        cardId,
        foundCount,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [cardProgress.gameId, cardProgress.cardId],
        set: {
          foundCount,
          updatedAt: new Date().toISOString(),
        },
      })
  }

  async getTopByGame(gameId: number, limit: number): Promise<CardProgress[]> {
    const rows = await this.db
      .select()
      .from(cardProgress)
      .where(eq(cardProgress.gameId, gameId))
      .orderBy(desc(cardProgress.foundCount))
      .limit(limit)
    return rows.map(this.mapRow)
  }

  async findByGame(gameId: number): Promise<CardProgress[]> {
    const rows = await this.db
      .select()
      .from(cardProgress)
      .where(eq(cardProgress.gameId, gameId))
    return rows.map(this.mapRow)
  }

  async deleteByGame(gameId: number): Promise<void> {
    await this.db.delete(cardProgress).where(eq(cardProgress.gameId, gameId))
  }

  private mapRow(row: any): CardProgress {
    return {
      gameId: row.gameId ?? row.game_id,
      cardId: row.cardId ?? row.card_id,
      foundCount: row.foundCount ?? row.found_count,
      updatedAt: new Date(row.updatedAt ?? row.updated_at),
    }
  }
}
