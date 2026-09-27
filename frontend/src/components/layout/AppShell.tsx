import { useState } from 'react'
import { ArrowRight, Menu, TrendingUp, X } from 'lucide-react'

import { Disclaimer } from '@/components/common/Disclaimer'
import { USE_MOCKS } from '@/services/api'

interface AppShellProps {
  onHome: () => void
  onMarkets: () => void
  onStartAssessment: () => void
  marketsActive: boolean
  landingActive: boolean
  children: React.ReactNode
}

const MARKET_TICKER = [
  { symbol: 'S&P 500', value: '5,412.20', change: '+0.62%', positive: true },
  { symbol: 'NASDAQ', value: '17,830.11', change: '+0.81%', positive: true },
  { symbol: '10Y YIELD', value: '4.21%', change: '-0.03', positive: false },
  { symbol: 'BTC', value: '$68,420', change: '+1.4%', positive: true },
]

export function AppShell({ onHome, onMarkets, onStartAssessment, marketsActive, landingActive, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="border-b border-white/10 bg-[#090b0c] px-4 py-1.5 text-center text-[0.68rem] text-[#c4c8c5]">
        Educational simulator · No real money or trading · Not financial advice
      </div>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101214]/95 backdrop-blur">
        <div className="mx-auto flex min-h-[4.25rem] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => { onMarkets(); closeMenu() }}
            className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <span className="grid size-9 place-items-center border border-primary/50 bg-primary/10 text-primary">
              <TrendingUp className="size-[1.15rem]" aria-hidden />
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-editorial text-xl font-semibold uppercase tracking-wide">Portfolio</span>
              <span className="mt-1 font-market-data text-[0.58rem] uppercase tracking-wider text-muted-foreground">Simulator / Research</span>
            </span>
          </button>
          <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-wide md:flex" aria-label="Main navigation">
            <button type="button" onClick={onHome} aria-current={!marketsActive ? 'page' : undefined} className={!marketsActive ? 'text-foreground' : 'text-muted-foreground transition-colors hover:text-foreground'}>Learn</button>
            <button type="button" onClick={onMarkets} aria-current={marketsActive ? 'page' : undefined} className={marketsActive ? 'text-foreground' : 'text-muted-foreground transition-colors hover:text-foreground'}>Market portfolios</button>
          </nav>
          <div className="hidden items-center gap-4 md:flex">
            {USE_MOCKS && !marketsActive && !landingActive && <span className="font-market-data text-[0.62rem] uppercase text-muted-foreground">Fixture demo</span>}
            <button type="button" onClick={onStartAssessment} className="inline-flex h-10 items-center gap-2 bg-primary px-4 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-[#9acbff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              Start assessment <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            className="grid size-10 place-items-center border border-border text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </header>
      {menuOpen && (
        <nav className="border-b border-white/10 bg-[#151819] px-4 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-1">
            <button type="button" onClick={() => { onHome(); closeMenu() }} className="min-h-11 border-b border-white/10 px-2 text-left text-sm">Learn</button>
            <button type="button" onClick={() => { onMarkets(); closeMenu() }} className="min-h-11 border-b border-white/10 px-2 text-left text-sm">Market portfolios</button>
            <button type="button" onClick={() => { onStartAssessment(); closeMenu() }} className="mt-3 flex min-h-11 items-center justify-center gap-2 bg-primary px-3 text-sm font-semibold text-primary-foreground">Start assessment <ArrowRight className="size-4" aria-hidden /></button>
            {USE_MOCKS && !marketsActive && !landingActive && <p className="px-2 pt-3 font-market-data text-[0.62rem] uppercase text-muted-foreground">Fixture demo</p>}
          </div>
        </nav>
      )}
      <section className="border-b border-white/10 bg-[#151819]" aria-label="Illustrative market data">
        <div className="mx-auto flex max-w-[1440px] items-stretch px-4 sm:px-6 lg:px-10">
          <span className="flex shrink-0 items-center border-r border-white/10 pr-4 font-market-data text-[0.58rem] uppercase leading-tight tracking-wide text-muted-foreground sm:pr-6">Illustrative<br className="sm:hidden" /> market data</span>
          <div className="ticker-viewport min-w-0 overflow-hidden py-3 pl-4 sm:pl-6" aria-label="Illustrative market data ticker">
            <div className="ticker-track flex w-max">
              {[0, 1].map(copy => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                  {MARKET_TICKER.map(item => (
                    <div key={item.symbol} className="flex min-w-[9.5rem] items-center gap-2 border-r border-white/10 pr-5 pl-4 first:pl-0 sm:min-w-[11rem]">
                      <span className="font-market-data text-[0.62rem] font-medium text-[#c5c9c7]">{item.symbol}</span>
                      <span className="font-market-data text-[0.66rem] text-foreground">{item.value}</span>
                      <span className={`font-market-data text-[0.62rem] ${item.positive ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>{item.change}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">{children}</main>
      <footer className="border-t border-white/10 bg-[#0b0d0e]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <Disclaimer />
        </div>
      </footer>
    </div>
  )
}

