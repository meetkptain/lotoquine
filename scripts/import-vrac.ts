import { readFileSync } from "fs"
import { createTables, getTursoClient } from "../src/db/client"

async function main() {
  const client = getTursoClient()
  await createTables()

  const content = readFileSync("vrac.md", "utf-8")
  const lines = content.trim().split("\n").filter(Boolean)

  const cards: { serial: string; numbers: number[] }[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 16) {
      console.warn(`  ⚠️  Ligne ignorée (pas assez de nombres): ${line}`)
      continue
    }
    const serial = parts[0]
    const numbers = parts.slice(1, 16).map(Number)
    if (numbers.some(isNaN)) {
      console.warn(`  ⚠️  Ligne ignorée (nombres invalides): ${line}`)
      continue
    }
    cards.push({ serial, numbers })
  }

  console.log(`${cards.length} cartons à importer`)

  // Clear existing game data
  await client.execute("DELETE FROM card_progress")
  await client.execute("DELETE FROM draws")
  await client.execute("DELETE FROM winners")
  await client.execute("DELETE FROM games_cards")
  await client.execute("DELETE FROM card_numbers")
  await client.execute("DELETE FROM cards")
  await client.execute("DELETE FROM games")

  const now = new Date().toISOString()

  // Insert cards
  const cardStmts = cards.map((c) => ({
    sql: "INSERT INTO cards (serial_number, active, created_at) VALUES (?, 1, ?)",
    args: [c.serial, now],
  }))
  const cardResults = await client.batch(cardStmts)

  // Insert card numbers
  const numStmts: { sql: string; args: any[] }[] = []
  for (let i = 0; i < cardResults.length; i++) {
    const cardId = Number(cardResults[i].lastInsertRowid)
    for (const num of cards[i].numbers) {
      numStmts.push({
        sql: "INSERT INTO card_numbers (card_id, number) VALUES (?, ?)",
        args: [cardId, num],
      })
    }
  }
  await client.batch(numStmts)

  console.log(`✅ ${cards.length} cartons importés`)

  // Create a game with these cards
  const gameResult = await client.execute({
    sql: "INSERT INTO games (name, status, created_at) VALUES (?, 'WAITING', ?)",
    args: [`Partie Lotoquine ${new Date().toLocaleDateString("fr-FR")}`, now],
  })
  const gameId = Number(gameResult.lastInsertRowid)

  // Link cards to game
  const allCards = await client.execute("SELECT id FROM cards WHERE active = 1")
  const rows = allCards.rows as unknown as { id: number }[]
  const linkStmts = rows.map((row: any) => ({
    sql: "INSERT INTO games_cards (game_id, card_id) VALUES (?, ?)",
    args: [gameId, row.id],
  }))
  await client.batch(linkStmts)

  console.log(`🎮 Partie #${gameId} prête — ${rows.length} cartons`)
}

main().catch(console.error)
