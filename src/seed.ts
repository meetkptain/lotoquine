import { getTursoClient, createTables } from "./db/client"

const SERIES_PREFIXES = ["FD", "FR", "FC", "FP", "FX"]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateNumbers(count: number): number[] {
  const nums = new Set<number>()
  while (nums.size < count) {
    nums.add(randomInt(1, 90))
  }
  return Array.from(nums)
}

function generateSerial(index: number): string {
  const prefix = SERIES_PREFIXES[index % SERIES_PREFIXES.length]
  const num = String(index).padStart(6, "0")
  return `${prefix}${num}`
}

async function seed() {
  const client = getTursoClient()

  await createTables()

  // Clear existing data
  for (const table of ["card_progress", "draws", "winners", "games_cards", "card_numbers", "cards", "games"]) {
    await client.execute(`DELETE FROM ${table}`)
  }

  const TOTAL = 1_000
  const BATCH = 100
  const now = new Date().toISOString()

  console.log(`Seeding ${TOTAL} cards...`)

  // Pre-generate all card data
  const allCards: { serial: string; numbers: number[] }[] = []
  for (let i = 0; i < TOTAL; i++) {
    allCards.push({ serial: generateSerial(i + 1), numbers: generateNumbers(15) })
  }

  for (let batchStart = 0; batchStart < TOTAL; batchStart += BATCH) {
    const batchEnd = Math.min(batchStart + BATCH, TOTAL)

    // Insert cards in batch
    const cardStmts = []
    for (let i = batchStart; i < batchEnd; i++) {
      cardStmts.push({
        sql: "INSERT INTO cards (serial_number, active, created_at) VALUES (?, 1, ?)",
        args: [allCards[i].serial, now],
      })
    }
    const cardResults = await client.batch(cardStmts)

    // Collect all card_numbers inserts in one batch
    const numStmts: { sql: string; args: any[] }[] = []
    for (let j = 0; j < cardResults.length; j++) {
      const cardId = Number(cardResults[j].lastInsertRowid)
      for (const num of allCards[batchStart + j].numbers) {
        numStmts.push({
          sql: "INSERT INTO card_numbers (card_id, number) VALUES (?, ?)",
          args: [cardId, num],
        })
      }
    }
    await client.batch(numStmts)

    const pct = Math.round((batchEnd / TOTAL) * 100)
    console.log(`  ${batchEnd}/${TOTAL} (${pct}%)`)
  }

  console.log("\n✅ Cartons créés")

  // Create demo game
  const gameResult = await client.execute({
    sql: "INSERT INTO games (name, status, created_at) VALUES (?, 'WAITING', ?)",
    args: [`Démo Lotoquine ${new Date().toLocaleDateString("fr-FR")}`, now],
  })
  const gameId = Number(gameResult.lastInsertRowid)
  console.log(`Game ID: ${gameId}`)

  // Associate all active cards with game
  const allCardsResult = await client.execute("SELECT id FROM cards WHERE active = 1")
  const rows = allCardsResult.rows as unknown as { id: number }[]

  const linkStmts = rows.map((row: any) => ({
    sql: "INSERT INTO games_cards (game_id, card_id) VALUES (?, ?)",
    args: [gameId, row.id],
  }))
  await client.batch(linkStmts)

  console.log(`🎮 Partie #${gameId} prête — ${rows.length} cartons`)
  console.log(`\n👉 npm run dev puis /live/${gameId}`)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
