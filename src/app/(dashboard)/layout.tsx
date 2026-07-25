"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const NAV_LINKS = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/cards", label: "Cartons" },
  { href: "/import", label: "Import" },
  { href: "/admin", label: "Admin" },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-base sm:text-lg font-bold tracking-tight text-primary shrink-0">
            LOTOQUINE
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-2.5 py-1.5 text-sm rounded-lg transition-colors ${
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 -mr-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {menuOpen && (
          <nav className="sm:hidden border-t border-border bg-card px-3 py-2 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2.5 text-sm rounded-lg transition-colors ${
                  pathname === link.href || pathname.startsWith(link.href + "/")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  )
}
