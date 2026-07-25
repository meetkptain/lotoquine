import type { Card, CreateCardDTO } from "@/types"
import type { ICardRepository } from "../interfaces"
import { cards } from "@/db/schema"
import { eq, like, sql } from "drizzle-orm"
import type { LibSQLDatabase } from "drizzle-orm/libsql"

type DbType = LibSQLDatabase<any>

export class DrizzleCardRepository implements ICardRepository {
  constructor(private db: DbType) {}

  async create(data: CreateCardDTO): Promise<Card> {
    const [row] = await this.db
      .insert(cards)
      .values({ serialNumber: data.serialNumber })
      .returning()
    return this.mapRow(row)
  }

  async bulkCreate(data: CreateCardDTO[]): Promise<Card[]> {
    const values = data.map((d) => ({ serialNumber: d.serialNumber }))
    const rows = await this.db.insert(cards).values(values).returning()
    return rows.map(this.mapRow)
  }

  async findById(id: number): Promise<Card | null> {
    const [row] = await this.db.select().from(cards).where(eq(cards.id, id))
    return row ? this.mapRow(row) : null
  }

  async findBySerialNumber(serial: string): Promise<Card | null> {
    const [row] = await this.db
      .select()
      .from(cards)
      .where(eq(cards.serialNumber, serial))
    return row ? this.mapRow(row) : null
  }

  async findActive(): Promise<Card[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .where(eq(cards.active, true))
      .orderBy(cards.id)
    return rows.map(this.mapRow)
  }

  async findAll(): Promise<Card[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .orderBy(cards.id)
    return rows.map(this.mapRow)
  }

  async search(query: string): Promise<Card[]> {
    const rows = await this.db
      .select()
      .from(cards)
      .where(like(cards.serialNumber, `%${query}%`))
      .orderBy(cards.id)
    return rows.map(this.mapRow)
  }

  async deactivate(id: number): Promise<void> {
    await this.db.update(cards).set({ active: false }).where(eq(cards.id, id))
  }

  async delete(id: number): Promise<void> {
    await this.db.delete(cards).where(eq(cards.id, id))
  }

  async count(): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(cards)
    return Number(row.count)
  }

  private mapRow(row: any): Card {
    return {
      id: row.id,
      serialNumber: row.serialNumber ?? row.serial_number,
      numbers: [],
      active: Boolean(row.active),
      createdAt: new Date(row.createdAt ?? row.created_at),
    }
  }
}
