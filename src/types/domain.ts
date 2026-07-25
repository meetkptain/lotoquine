export type GameStatus = "WAITING" | "RUNNING" | "FINISHED"

export interface Card {
  id: number
  serialNumber: string
  numbers: number[]
  active: boolean
  createdAt: Date
}

export interface Game {
  id: number
  name: string
  status: GameStatus
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  winnerCardId: number | null
}

export interface Draw {
  id: number
  gameId: number
  number: number
  position: number
  createdAt: Date
}

export interface CardProgress {
  gameId: number
  cardId: number
  foundCount: number
  updatedAt: Date
}

export interface Winner {
  id: number
  gameId: number
  cardId: number
  createdAt: Date
}

export interface GameCard {
  id: number
  gameId: number
  cardId: number
}
