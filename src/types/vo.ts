import { MIN_NUMBER, MAX_NUMBER, SERIAL_REGEX } from "@/lib/constants"
import { ValidationError } from "@/lib/errors"

export class SerialNumber {
  private constructor(readonly value: string) {}

  static create(value: string): SerialNumber {
    const trimmed = value.trim().toUpperCase()
    if (!SERIAL_REGEX.test(trimmed)) {
      throw new ValidationError(
        `Format de série invalide: "${value}" (attendu: FD suivi de 6 chiffres)`
      )
    }
    return new SerialNumber(trimmed)
  }

  toString(): string {
    return this.value
  }
}

export class NumberDraw {
  private constructor(readonly value: number) {}

  static create(value: number): NumberDraw {
    if (!Number.isInteger(value) || value < MIN_NUMBER || value > MAX_NUMBER) {
      throw new ValidationError(
        `Numéro invalide: ${value} (doit être un entier entre ${MIN_NUMBER} et ${MAX_NUMBER})`
      )
    }
    return new NumberDraw(value)
  }

  toString(): string {
    return String(this.value)
  }
}

export class GameName {
  private constructor(readonly value: string) {}

  static create(value: string): GameName {
    const trimmed = value.trim()
    if (!trimmed) {
      throw new ValidationError("Le nom de la partie ne peut pas être vide")
    }
    if (trimmed.length > 200) {
      throw new ValidationError("Le nom de la partie est trop long (max 200 caractères)")
    }
    return new GameName(trimmed)
  }

  toString(): string {
    return this.value
  }
}

export interface CardRanking {
  cardId: number
  serialNumber: string
  foundCount: number
  totalCount: number
}

export interface GameState {
  gameId: number
  gameName: string
  status: "idle" | "running" | "finished" | "paused"
  drawnNumbers: number[]
  topCards: CardRanking[]
  winners: CardRanking[]
  activeCardCount: number
}

export interface DrawResult {
  number: number
  position: number
  topCards: CardRanking[]
  winners: CardRanking[]
}

export interface CreateCardDTO {
  serialNumber: string
  numbers: number[]
}

export interface CreateGameDTO {
  name: string
  cardIds: number[]
}

export interface CsvCardRow {
  serial_number: string
  [key: string]: string | undefined
}
