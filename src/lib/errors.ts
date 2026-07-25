export class GameError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GameError"
  }
}

export class GameNotFoundError extends GameError {
  constructor(id: number) {
    super(`Partie #${id} introuvable`)
    this.name = "GameNotFoundError"
  }
}

export class CardNotFoundError extends GameError {
  constructor(id: number) {
    super(`Carton #${id} introuvable`)
    this.name = "CardNotFoundError"
  }
}

export class CardNotFoundBySerialError extends GameError {
  constructor(serial: string) {
    super(`Carton ${serial} introuvable`)
    this.name = "CardNotFoundBySerialError"
  }
}

export class InvalidNumberError extends GameError {
  constructor(number: number) {
    super(`Numéro invalide: ${number} (doit être entre 1 et 90)`)
    this.name = "InvalidNumberError"
  }
}

export class GameNotRunningError extends GameError {
  constructor(id: number, status: string) {
    super(`Partie #${id} n'est pas en cours (statut: ${status})`)
    this.name = "GameNotRunningError"
  }
}

export class GameNotWaitingError extends GameError {
  constructor(id: number) {
    super(`Partie #${id} n'est pas en attente`)
    this.name = "GameNotWaitingError"
  }
}

export class DuplicateDrawError extends GameError {
  constructor(number: number, gameId: number) {
    super(`Numéro ${number} déjà tiré dans la partie #${gameId}`)
    this.name = "DuplicateDrawError"
  }
}

export class NoDrawToUndoError extends GameError {
  constructor(gameId: number) {
    super(`Aucun tirage à annuler dans la partie #${gameId}`)
    this.name = "NoDrawToUndoError"
  }
}

export class ValidationError extends GameError {
  details: string[]

  constructor(message: string, details: string[] = []) {
    super(message)
    this.name = "ValidationError"
    this.details = details
  }
}

export class CsvImportError extends GameError {
  lineErrors: { line: number; message: string }[]

  constructor(lineErrors: { line: number; message: string }[]) {
    super(`${lineErrors.length} erreur(s) dans le fichier CSV`)
    this.name = "CsvImportError"
    this.lineErrors = lineErrors
  }
}
