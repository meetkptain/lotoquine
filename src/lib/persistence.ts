const STORAGE_KEY_PREFIX = "lotoquine_game_"

export interface SavedGameState {
  gameId: number
  gameName: string
  drawnNumbers: number[]
  timestamp: number
}

export function saveGameState(gameId: number, gameName: string, drawnNumbers: number[]): void {
  try {
    const data: SavedGameState = {
      gameId,
      gameName,
      drawnNumbers: [...drawnNumbers],
      timestamp: Date.now(),
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${gameId}`, JSON.stringify(data))
  } catch {
    // localStorage may be full or unavailable
  }
}

export function loadGameState(gameId: number): SavedGameState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${gameId}`)
    if (!raw) return null
    return JSON.parse(raw) as SavedGameState
  } catch {
    return null
  }
}

export function clearGameState(gameId: number): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${gameId}`)
  } catch {
    // ignore
  }
}

export function getAllSavedGames(): SavedGameState[] {
  try {
    const games: SavedGameState[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key)
        if (raw) {
          try {
            games.push(JSON.parse(raw))
          } catch {}
        }
      }
    }
    return games.sort((a, b) => b.timestamp - a.timestamp)
  } catch {
    return []
  }
}
