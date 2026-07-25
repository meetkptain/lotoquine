"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Upload, Keyboard, ScanLine } from "lucide-react"
import { toast } from "sonner"
import { NUMBERS_PER_CARD } from "@/lib/constants"

type EntryStatus = "pending" | "success" | "error"

interface EntryResult {
  line: number
  serial: string
  numbers: number[]
  status: EntryStatus
  message?: string
}

export default function AdminPage() {
  const [mode, setMode] = useState<"batch" | "quick">("quick")
  const [input, setInput] = useState("")
  const [results, setResults] = useState<EntryResult[]>([])
  const [importing, setImporting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Quick entry fields
  const [quickSerial, setQuickSerial] = useState("")
  const [quickNumbers, setQuickNumbers] = useState<string[]>(Array(15).fill(""))
  const quickInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const parseBatch = useCallback((text: string): { serial: string; numbers: number[] }[] => {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/[\s,;|\t]+/)
        const serial = parts[0]?.toUpperCase() || ""
        const numbers = parts
          .slice(1)
          .map(Number)
          .filter((n) => !isNaN(n) && n >= 1 && n <= 90)
        return { serial, numbers }
      })
  }, [])

  async function handleBatchImport() {
    if (!input.trim()) return
    setImporting(true)

    const entries = parseBatch(input)
    const newResults: EntryResult[] = []

    for (let i = 0; i < entries.length; i++) {
      const { serial, numbers } = entries[i]

      if (!serial) {
        newResults.push({ line: i + 1, serial: "", numbers: [], status: "error", message: "Série manquante" })
        continue
      }

      if (numbers.length !== NUMBERS_PER_CARD) {
        newResults.push({
          line: i + 1,
          serial,
          numbers,
          status: "error",
          message: `${numbers.length}/${NUMBERS_PER_CARD} numéros`,
        })
        continue
      }

      const unique = new Set(numbers)
      if (unique.size !== numbers.length) {
        newResults.push({ line: i + 1, serial, numbers, status: "error", message: "Numéros en double" })
        continue
      }

      try {
        const { addCardAction } = await import("@/actions/game.actions")
        await addCardAction({ serialNumber: serial, numbers })
        newResults.push({ line: i + 1, serial, numbers, status: "success" })
      } catch (e: any) {
        newResults.push({ line: i + 1, serial, numbers, status: "error", message: e.message })
      }
    }

    setResults(newResults)
    setImporting(false)

    const successCount = newResults.filter((r) => r.status === "success").length
    const errorCount = newResults.filter((r) => r.status === "error").length

    if (errorCount === 0) {
      toast.success(`${successCount} carton(s) importé(s)`)
      setInput("")
    } else {
      toast.warning(`${successCount} ok, ${errorCount} erreur(s)`)
    }
  }

  async function handleQuickAdd() {
    if (!quickSerial.trim()) {
      toast.error("Numéro de série requis")
      return
    }

    const numbers = quickNumbers
      .map((v) => v.trim())
      .filter((v) => v !== "")
      .map(Number)
      .filter((n) => !isNaN(n) && n >= 1 && n <= 90)

    if (numbers.length === 0) {
      toast.error("Au moins 1 numéro requis")
      return
    }

    try {
      const { addCardAction } = await import("@/actions/game.actions")
      await addCardAction({
        serialNumber: quickSerial.trim().toUpperCase(),
        numbers,
      })

      setQuickSerial("")
      setQuickNumbers(Array(15).fill(""))
      quickInputRefs.current[0]?.focus()
      toast.success(`Carton ${quickSerial.trim().toUpperCase()} ajouté`)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  function handleQuickNumberChange(index: number, value: string) {
    const next = [...quickNumbers]
    next[index] = value
    setQuickNumbers(next)

    // Auto-advance to next field
    if (value && index < 14) {
      quickInputRefs.current[index + 1]?.focus()
    }
  }

  function handleQuickKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleQuickAdd()
    }
    if (e.key === "Backspace" && !quickNumbers[index] && index > 0) {
      quickInputRefs.current[index - 1]?.focus()
    }
  }

  function handleBatchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleBatchImport()
    }
  }

  const successCount = results.filter((r) => r.status === "success").length
  const errorCount = results.filter((r) => r.status === "error").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Entrée rapide</h1>
          <p className="text-sm text-muted-foreground">
            Ajoutez des cartons en quelques secondes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={mode === "quick" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("quick")}
          >
            <Keyboard className="w-4 h-4 mr-1" />
            Saisie rapide
          </Button>
          <Button
            variant={mode === "batch" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("batch")}
          >
            <ScanLine className="w-4 h-4 mr-1" />
            Par lots
          </Button>
        </div>
      </div>

      {/* Quick entry mode — one card at a time, keyboard-first */}
      {mode === "quick" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Numéro de série</label>
              <input
                autoFocus
                className="w-full h-12 px-4 rounded-lg bg-background border border-border text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="FD000001"
                value={quickSerial}
                onChange={(e) => setQuickSerial(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickSerial) {
                    quickInputRefs.current[0]?.focus()
                  }
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                Numéros (Tab pour avancer, Entrée pour valider)
              </label>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 sm:gap-2">
                {quickNumbers.map((val, i) => (
                  <input
                    key={i}
                    ref={(el) => { quickInputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    className="h-10 sm:h-12 w-full text-center rounded-lg bg-background border border-border text-sm sm:text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder={`N${i + 1}`}
                    value={val}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "")
                      if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 90)) handleQuickNumberChange(i, v)
                    }}
                    onKeyDown={(e) => handleQuickKeyDown(e, i)}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button size="lg" onClick={handleQuickAdd} className="h-12 text-base">
                <Upload className="w-4 h-4 mr-2" />
                Ajouter le carton
              </Button>
              <p className="text-xs text-muted-foreground self-center ml-2">
                Entrée pour valider · Tab entre les numéros
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch mode — paste many cards at once */}
      {mode === "batch" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Cartons (un par ligne : série n1 n2 n3 ...)
              </label>
              <textarea
                ref={textareaRef}
                className="w-full h-64 p-4 rounded-lg bg-background border border-border font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                placeholder={
                  `FD000001 12 34 45 67 89 10 11 12 13 14 15 16 17 18 19\nFD000002 2 18 44 90 33 55 77 22 66 88 11 99 30 60 80\nFD000003 5 25 35 50 70 15 40 65 85 20 45 75 90 10 55`
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleBatchKeyDown}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ctrl+Entrée ou ⌘+Entrée pour importer · Séparateurs: espace, virgule, tabulation
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="lg"
                onClick={handleBatchImport}
                disabled={importing || !input.trim()}
                className="h-12 text-base"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? "Import..." : `Importer (${input.trim() ? input.trim().split("\n").length : 0} carton(s))`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="w-4 h-4" /> {successCount} ok
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-4 h-4" /> {errorCount} erreur(s)
              </span>
            )}
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <Card key={i} className={r.status === "error" ? "border-red-500/30" : ""}>
                <CardContent className="flex items-center gap-2 py-2 px-3">
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-mono text-sm font-medium truncate min-w-0">
                    {r.serial || `Ligne ${r.line}`}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {r.numbers.length} num
                  </span>
                  {r.message && (
                    <span className="text-xs text-muted-foreground truncate min-w-0 ml-auto">{r.message}</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
