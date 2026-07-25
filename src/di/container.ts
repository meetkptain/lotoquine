import "server-only"
import { getDb } from "@/db/client"
import { DrizzleGameRepository } from "@/repositories/drizzle/drizzle-game-repository"
import { DrizzleCardRepository } from "@/repositories/drizzle/drizzle-card-repository"
import { DrizzleDrawRepository } from "@/repositories/drizzle/drizzle-draw-repository"
import { DrizzleGameCardRepository } from "@/repositories/drizzle/drizzle-game-card-repository"
import { DrizzleCardProgressRepository } from "@/repositories/drizzle/drizzle-card-progress-repository"
import type {
  IGameRepository,
  ICardRepository,
  IDrawRepository,
  IGameCardRepository,
  ICardProgressRepository,
} from "@/repositories/interfaces"

export interface Container {
  gameRepo: IGameRepository
  cardRepo: ICardRepository
  drawRepo: IDrawRepository
  gameCardRepo: IGameCardRepository
  progressRepo: ICardProgressRepository
}

let container: Container | null = null

export function createContainer(): Container {
  if (container) return container

  const db = getDb()

  container = {
    gameRepo: new DrizzleGameRepository(db),
    cardRepo: new DrizzleCardRepository(db),
    drawRepo: new DrizzleDrawRepository(db),
    gameCardRepo: new DrizzleGameCardRepository(db),
    progressRepo: new DrizzleCardProgressRepository(db),
  }

  return container
}

export function getContainer(): Container {
  if (!container) return createContainer()
  return container
}
