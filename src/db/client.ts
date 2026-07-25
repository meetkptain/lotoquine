import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

let client: ReturnType<typeof createClient> | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getTursoClient() {
  if (!client) {
    const url = process.env.TURSO_DB_URL
    const authToken = process.env.TURSO_DB_AUTH_TOKEN
    if (!url) throw new Error("TURSO_DB_URL is not set")
    client = createClient({ url, authToken })
  }
  return client
}

export function getDb() {
  if (!db) {
    db = drizzle(getTursoClient(), { schema })
  }
  return db
}

const CREATE_STMTS = [
  `CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'WAITING' CHECK(status IN ('WAITING','RUNNING','FINISHED')),
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    winner_card_id INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS card_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    UNIQUE(card_id, number)
  )`,
  `CREATE TABLE IF NOT EXISTS games_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(game_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS card_progress (
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    found_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(game_id, card_id)
  )`,
  `CREATE TABLE IF NOT EXISTS winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cards_serial ON cards(serial_number)`,
  `CREATE INDEX IF NOT EXISTS idx_card_numbers_number ON card_numbers(number)`,
  `CREATE INDEX IF NOT EXISTS idx_draws_game ON draws(game_id)`,
  `CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)`,
  `CREATE INDEX IF NOT EXISTS idx_card_numbers_card ON card_numbers(card_id)`,
]

export async function createTables() {
  const c = getTursoClient()
  for (const sql of CREATE_STMTS) {
    await c.execute(sql)
  }
}
