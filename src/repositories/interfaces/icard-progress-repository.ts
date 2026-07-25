import type { CardProgress } from "@/types"

export interface ICardProgressRepository {
  upsert(gameId: number, cardId: number, foundCount: number): Promise<void>
  getTopByGame(gameId: number, limit: number): Promise<CardProgress[]>
  findByGame(gameId: number): Promise<CardProgress[]>
  deleteByGame(gameId: number): Promise<void>
}
