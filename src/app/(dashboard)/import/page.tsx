"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    imported: number
    errors: { line: number; message: string }[]
  } | null>(null)

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("Format de fichier invalide. Utilisez un fichier CSV.")
      return
    }

    setImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const { parse } = await import("papaparse")
      const parsed = parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      })

      if (parsed.errors.length > 0) {
        toast.error(`Erreur de parsing CSV: ${parsed.errors[0].message}`)
        setImporting(false)
        return
      }

      const { importCardsAction } = await import("@/actions/game.actions")
      const res = await importCardsAction(parsed.data as any[])
      setResult(res)

      if (res.errors.length === 0) {
        toast.success(`${res.imported} cartons importés avec succès`)
      } else {
        toast.warning(`${res.imported} importés, ${res.errors.length} erreurs`)
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'import")
    } finally {
      setImporting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Import CSV</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Format attendu</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-3 rounded text-xs font-mono overflow-x-auto whitespace-pre">
            serial_number,n1,n2,n3,...,n15{"\n"}
            FD000001,12,34,45,67,89,...{"\n"}
            FD000002,2,18,44,90,...
          </pre>
          <p className="text-sm text-muted-foreground mt-2">
            Les numéros doivent être compris entre 1 et 90. Chaque carton doit avoir exactement 15 numéros uniques.
          </p>
        </CardContent>
      </Card>

      <div
        className="border-2 border-dashed border-border rounded-lg p-6 sm:p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">
          {importing ? "Import en cours..." : "Cliquez ou déposez un fichier CSV"}
        </p>
        <p className="text-sm text-muted-foreground">
          {importing ? "Veuillez patienter..." : "Fichier CSV avec en-têtes"}
        </p>
      </div>

      {importing && (
        <Card>
          <CardContent className="py-4 flex items-center gap-3">
            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm">Import et validation en cours...</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-3">
          <Card className="border-green-500/50">
            <CardContent className="py-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <p className="font-medium">{result.imported} cartons importés</p>
              </div>
            </CardContent>
          </Card>

          {result.errors.length > 0 && (
            <Card className="border-red-500/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  {result.errors.length} erreur(s)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      Ligne {err.line}: {err.message}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
