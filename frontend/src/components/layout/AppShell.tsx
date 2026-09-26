import { TrendingUp } from 'lucide-react'

import { Disclaimer } from '@/components/common/Disclaimer'
import { USE_MOCKS } from '@/services/api'

interface AppShellProps {
  onHome: () => void
  onMarkets: () => void
  marketsActive: boolean
  children: React.ReactNode
}

export function AppShell({ onHome, onMarkets, marketsActive, children }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-slate-900 px-4 py-1.5 text-center text-xs text-slate-100">
        Educational simulator: no real money, no trading, not financial advice.
      </div>
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onMarkets}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <TrendingUp className="size-4" aria-hidden />
            </span>
            Portfolio Simulator
          </button>
          <nav className="flex items-center gap-3 text-sm" aria-label="Main navigation">
            <button type="button" onClick={onMarkets} aria-current={marketsActive ? 'page' : undefined} className={marketsActive ? 'font-semibold text-primary' : 'text-muted-foreground'}>Market portfolios</button>
            <button type="button" onClick={onHome} aria-current={!marketsActive ? 'page' : undefined} className={!marketsActive ? 'font-semibold text-primary' : 'text-muted-foreground'}>Original demo</button>
          </nav>
          {USE_MOCKS && !marketsActive && (
            <span className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
              Fixture demo
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Disclaimer />
        </div>
      </footer>
    </div>
  )
}

