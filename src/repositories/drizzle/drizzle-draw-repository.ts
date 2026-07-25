import type { Draw } from "@/types"
import type { IDrawRepository } from "../interfaces"
import { draws } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"

type DbType = LibSQLDatabase<any>

export class DrizzleDrawRepository implements IDrawRepository {
  constructor(private db: DbType) {}

  async add(gameId: number, number: number, position: number): Promise<Draw> {
    const [row] = await this.db
      .insert(draws)
      .values({ gameId, number, position })
      .returning()
    return this.mapRow(row)
  }

  async findByGame(gameId: number): Promise<Draw[]> {
    const rows = await this.db
      .select()
      .from(draws)
      .where(eq(draws.gameId, gameId))
      .orderBy(draws.position)
    return rows.map(this.mapRow)
  }

  async getLastDraw(gameId: number): Promise<Draw | null> {
    const [row] = await this.db
      .select()
      .from(draws)
      .where(eq(draws.gameId, gameId))
      .orderBy(desc(draws.position))
      .limit(1)
    return row ? this.mapRow(row) : null
  }

  async deleteLastDraw(gameId: number): Promise<Draw | null> {
    const last = await this.getLastDraw(gameId)
    if (last) {
      await this.db
        .delete(draws)
        .where(eq(draws.id, last.id))
    }
    return last
  }

  async deleteByGame(gameId: number): Promise<void> {
    await this.db.delete(draws).where(eq(draws.gameId, gameId))
  }

  private mapRow(row: any): Draw {
    return {
      id: row.id,
      gameId: row.gameId ?? row.game_id,
      number: row.number,
      position: row.position,
      createdAt: new Date(row.createdAt ?? row.created_at),
    }
  }
}
