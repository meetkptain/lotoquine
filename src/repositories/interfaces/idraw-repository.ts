import type { Draw } from "@/types"

export interface IDrawRepository {
  add(gameId: number, number: number, position: number): Promise<Draw>
  findByGame(gameId: number): Promise<Draw[]>
  getLastDraw(gameId: number): Promise<Draw | null>
  deleteLastDraw(gameId: number): Promise<Draw | null>
  deleteByGame(gameId: number): Promise<void>
}
