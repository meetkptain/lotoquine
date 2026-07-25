import type { Game, GameStatus, CreateGameDTO } from "@/types"

export interface IGameRepository {
  create(data: CreateGameDTO): Promise<Game>
  findById(id: number): Promise<Game | null>
  findAll(): Promise<Game[]>
  findByStatus(status: GameStatus): Promise<Game[]>
  updateStatus(id: number, status: GameStatus): Promise<void>
  startGame(id: number): Promise<void>
  finishGame(id: number, winnerCardId: number): Promise<void>
  delete(id: number): Promise<void>
}
