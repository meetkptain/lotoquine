import type { Game, GameStatus, CreateGameDTO } from "@/types"
import type { IGameRepository } from "../interfaces"
import { games } from "@/db/schema"
import { eq, inArray } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"

type DbType = LibSQLDatabase<any>

export class DrizzleGameRepository implements IGameRepository {
  constructor(private db: DbType) {}

  async create(data: CreateGameDTO): Promise<Game> {
    const [row] = await this.db
      .insert(games)
      .values({
        name: data.name,
        status: "WAITING",
      })
      .returning()
    return this.mapRow(row)
  }

  async findById(id: number): Promise<Game | null> {
    const [row] = await this.db.select().from(games).where(eq(games.id, id))
    return row ? this.mapRow(row) : null
  }

  async findAll(): Promise<Game[]> {
    const rows = await this.db
      .select()
      .from(games)
      .orderBy(games.createdAt)
    return rows.map(this.mapRow)
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    const rows = await this.db
      .select()
      .from(games)
      .where(eq(games.status, status))
      .orderBy(games.createdAt)
    return rows.map(this.mapRow)
  }

  async updateStatus(id: number, status: GameStatus): Promise<void> {
    await this.db.update(games).set({ status }).where(eq(games.id, id))
  }

  async startGame(id: number): Promise<void> {
    await this.db
      .update(games)
      .set({ status: "RUNNING", startedAt: new Date().toISOString() })
      .where(eq(games.id, id))
  }

  async finishGame(id: number, winnerCardId: number): Promise<void> {
    await this.db
      .update(games)
      .set({
        status: "FINISHED",
        finishedAt: new Date().toISOString(),
        winnerCardId,
      })
      .where(eq(games.id, id))
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(games).where(eq(games.id, id))
  }

  private mapRow(row: any): Game {
    return {
      id: row.id,
      name: row.name,
      status: row.status as GameStatus,
      createdAt: new Date(row.createdAt ?? (row as any).created_at),
      startedAt: row.startedAt || (row as any).started_at
        ? new Date(row.startedAt ?? (row as any).started_at)
        : null,
      finishedAt: row.finishedAt || (row as any).finished_at
        ? new Date(row.finishedAt ?? (row as any).finished_at)
        : null,
      winnerCardId: row.winnerCardId ?? (row as any).winner_card_id ?? null,
    }
  }
}
