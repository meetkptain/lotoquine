export const MIN_NUMBER = 1
export const MAX_NUMBER = 99
export const NUMBERS_PER_CARD = 15
export const SERIAL_REGEX = /^FD\d{6}$/
export const SERIAL_PATTERN = "FD000000"

export const GAME_STATUS = ["WAITING", "RUNNING", "FINISHED"] as const

export const TOP_CARDS_LIMIT = 10

export const LIVE_DEBOUNCE_MS = 50

export const AUTO_SAVE_INTERVAL_MS = 5000

export const IDLE_CURSOR_TIMEOUT_MS = 3000

export const CSV_HEADERS = [
  "serial_number",
  ...Array.from({ length: NUMBERS_PER_CARD }, (_, i) => `n${i + 1}`),
]
