import { MIN_NUMBER, MAX_NUMBER, NUMBERS_PER_CARD, SERIAL_REGEX, CSV_HEADERS } from "@/lib/constants"
import { ValidationError, CsvImportError } from "@/lib/errors"
import type { CreateCardDTO, CsvCardRow } from "@/types"

export function validateCardNumber(number: number): void {
  if (!Number.isInteger(number) || number < MIN_NUMBER || number > MAX_NUMBER) {
    throw new ValidationError(
      `Numéro ${number} invalide (doit être entre ${MIN_NUMBER} et ${MAX_NUMBER})`
    )
  }
}

export function validateSerialNumber(serial: string): void {
  if (!SERIAL_REGEX.test(serial.trim().toUpperCase())) {
    throw new ValidationError(
      `Série "${serial}" invalide (format attendu: FD suivi de 6 chiffres)`
    )
  }
}

export function validateCardNumbers(numbers: number[]): void {
  if (numbers.length !== NUMBERS_PER_CARD) {
    throw new ValidationError(
      `Un carton doit avoir exactement ${NUMBERS_PER_CARD} numéros (reçu: ${numbers.length})`
    )
  }

  const seen = new Set<number>()
  for (const n of numbers) {
    validateCardNumber(n)
    if (seen.has(n)) {
      throw new ValidationError(`Numéro en double dans le carton: ${n}`)
    }
    seen.add(n)
  }
}

export function validateAndParseRow(row: CsvCardRow, lineIndex: number): CreateCardDTO {
  const errors: string[] = []

  const serial = (row.serial_number || "").trim().toUpperCase()
  if (!serial) {
    errors.push("numéro de série manquant")
  } else if (!SERIAL_REGEX.test(serial)) {
    errors.push(`série "${serial}" invalide`)
  }

  const numbers: number[] = []
  for (let i = 1; i <= NUMBERS_PER_CARD; i++) {
    const key = `n${i}`
    const val = row[key]
    if (val === undefined || val === null || val.toString().trim() === "") {
      errors.push(`numéro n${i} manquant`)
      continue
    }
    const num = parseInt(val.toString().trim(), 10)
    if (isNaN(num) || num < MIN_NUMBER || num > MAX_NUMBER) {
      errors.push(`n${i}: "${val}" n'est pas un nombre valide (${MIN_NUMBER}-${MAX_NUMBER})`)
    } else {
      numbers.push(num)
    }
  }

  if (errors.length === 0 && numbers.length !== NUMBERS_PER_CARD) {
    errors.push(`nombre de numéros invalide: ${numbers.length}/${NUMBERS_PER_CARD}`)
  }

  const seen = new Set<number>()
  for (const n of numbers) {
    if (seen.has(n)) {
      errors.push(`numéro en double: ${n}`)
    }
    seen.add(n)
  }

  if (errors.length > 0) {
    throw new CsvImportError([{ line: lineIndex + 1, message: errors.join("; ") }])
  }

  return { serialNumber: serial, numbers }
}

export function validateCsvRows(rows: CsvCardRow[]): {
  validCards: CreateCardDTO[]
  errors: { line: number; message: string }[]
} {
  const validCards: CreateCardDTO[] = []
  const errors: { line: number; message: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    try {
      validCards.push(validateAndParseRow(rows[i], i))
    } catch (e) {
      if (e instanceof CsvImportError) {
        errors.push(...e.lineErrors)
      } else if (e instanceof ValidationError) {
        errors.push({ line: i + 1, message: e.message })
      }
    }
  }

  return { validCards, errors }
}
