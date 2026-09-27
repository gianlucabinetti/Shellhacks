import { useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Menu, ScanLine, ShieldCheck, X } from 'lucide-react'

import { Disclaimer } from '@/components/common/Disclaimer'
import { LiveTicker } from '@/components/market/LiveTicker'
import { cn } from '@/lib/utils'

interface AppShellProps {
  section: 'markets' | 'quiz'
  onMarkets: () => void
  onQuiz: () => void
  /** Wider content area for dense dashboard screens. */
  wide?: boolean
  children: React.ReactNode
}

export function AppShell({ section, onMarkets, onQuiz, wide = false, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const nav = [
    { label: 'Markets', active: section === 'markets', onClick: onMarkets },
    { label: 'Risk quiz', active: section === 'quiz', onClick: onQuiz },
  ]

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
      <div className="flex min-h-dvh flex-col">
        <header className="glass sticky top-0 z-40 border-b border-white/[0.06]">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => { onMarkets(); closeMenu() }}
              className="group flex items-center gap-2.5 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <motion.span whileHover={{ rotate: -8, scale: 1.05 }} className="bg-gradient-ai grid size-9 place-items-center rounded-xl text-[#07080a] shadow-lg shadow-[#7cb4ff]/25">
                <ScanLine className="size-[1.1rem]" aria-hidden />
              </motion.span>
              <span className="flex flex-col leading-none">
                <span className="text-[1.05rem] font-semibold tracking-tight">Portfolio X-Ray</span>
                <span className="mt-1 text-[0.62rem] font-medium text-muted-foreground">Real market data · AI copilot</span>
              </span>
            </button>

            <nav className="hidden items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 md:flex" aria-label="Main navigation">
              {nav.map(item => (
                <button key={item.label} type="button" onClick={item.onClick} aria-current={item.active ? 'page' : undefined}
                  className={cn('relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors', item.active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {item.active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white/[0.09]" />}
                  <span className="relative">{item.label}</span>
                </button>
              ))}
            </nav>

            <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <ShieldCheck className="size-3.5 text-primary" aria-hidden /> Practice mode · no real money
            </span>

            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl border border-white/10 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(open => !open)}
            >
              {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
          <AnimatePresence>
            {menuOpen && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-white/[0.06] md:hidden" aria-label="Mobile navigation"
              >
                <div className="flex flex-col gap-1 px-4 py-3">
                  {nav.map(item => (
                    <button key={item.label} type="button" onClick={() => { item.onClick(); closeMenu() }}
                      className={cn('min-h-11 rounded-xl px-3 text-left text-sm', item.active ? 'bg-white/[0.07]' : 'text-muted-foreground')}>
                      {item.label}
                    </button>
                  ))}
                  <p className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5 text-primary" aria-hidden /> Practice mode · no real money
                  </p>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>
        <LiveTicker />
        <main className={cn('mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8', wide ? 'max-w-[1400px]' : 'max-w-6xl')}>{children}</main>
        <footer className="border-t border-white/[0.06]">
          <div className={cn('mx-auto px-4 py-6 sm:px-6 lg:px-8', wide ? 'max-w-[1400px]' : 'max-w-6xl')}>
            <Disclaimer />
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
