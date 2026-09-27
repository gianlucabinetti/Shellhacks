import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Loader2, Sparkles, Wand2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildPortfolio } from '@/services/market'
import type { BuildResponse, MarketRequest } from '@/types/market'
import { formatPercent, formatSignedPercent } from '@/utils/format'

const EXAMPLES = [
  "I'm 22, want growth but can't handle big drops",
  "I'm 60 and want to keep my savings steady",
  'Some crypto, but spread out and not too wild',
  'Long-term growth, I can ride out crashes',
]
// Progress copy while the builder works; the request itself is a single call.
const STAGES = ['Reading your goal', 'Backtesting candidate mixes on real prices', 'Comparing worst drops and returns', 'Picking the best fit']

export function BuildWithAI({ investment, days, onBuilt }: {
  investment: number; days: MarketRequest['days']; onBuilt: (goal: string, result: BuildResponse) => void
}) {
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!busy) return
    const id = window.setInterval(() => setStage(s => Math.min(s + 1, STAGES.length - 1)), 1500)
    return () => window.clearInterval(id)
  }, [busy])

  const submit = async (text: string) => {
    const g = text.trim()
    if (g.length < 3 || busy) return
    setGoal(g)
    setError('')
    setStage(0)
    setBusy(true)
    try {
      onBuilt(g, await buildPortfolio(g, Number.isFinite(investment) && investment > 0 ? investment : 10000, days))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-ring rounded-2xl">
      <div className="glow-card flex flex-col gap-3 rounded-2xl p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="bg-gradient-ai grid size-7 place-items-center rounded-lg text-[#07080a]"><Wand2 className="size-4" aria-hidden /></span>
          Build it with AI
        </p>
        <form onSubmit={e => { e.preventDefault(); void submit(goal) }} className="flex flex-col gap-2">
          <label htmlFor="ai-goal" className="sr-only">Describe your goal</label>
          <textarea id="ai-goal" rows={2} maxLength={500} value={goal} disabled={busy} onChange={e => setGoal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(goal) } }}
            placeholder="Describe your goal in your own words…"
            className="resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm leading-6 placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:outline-none disabled:opacity-60" />
          <AnimatePresence initial={false} mode="wait">
            {busy ? (
              <motion.ol key="stages" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-1.5 py-1 text-xs" aria-live="polite">
                {STAGES.map((s, i) => (
                  <li key={s} className={cn('flex items-center gap-2 transition-colors', i <= stage ? 'text-foreground' : 'text-muted-foreground/50')}>
                    {i < stage ? <Check className="size-3.5 text-[var(--positive)]" aria-hidden />
                      : i === stage ? <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
                      : <span className="size-3.5" aria-hidden />}
                    {s}
                  </li>
                ))}
              </motion.ol>
            ) : (
              <motion.div key="examples" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-wrap gap-1.5">
                {EXAMPLES.map(ex => (
                  <button key={ex} type="button" onClick={() => { void submit(ex) }}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-left text-[0.7rem] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
                    {ex}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <Button type="submit" variant="gradient" disabled={busy || goal.trim().length < 3}>
            {busy ? <><Loader2 className="animate-spin" /> Building…</> : <><Sparkles /> Build my portfolio</>}
          </Button>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </form>
      </div>
    </div>
  )
}

const key = (holdings: { symbol: string; weight: number }[]) => holdings.map(h => `${h.symbol}:${h.weight.toFixed(4)}`).sort().join(',')

/** Shows what the builder made, why, and the candidates it backtested along the way. */
export function AiBuildCard({ goal, build, onDismiss }: { goal: string; build: BuildResponse; onDismiss: () => void }) {
  const chosen = key(build.result.holdings)
  const candidates = build.tested.some(t => key(t.holdings) === chosen) ? build.tested : [...build.tested, build.result]
  return (
    <div className="ai-ring rounded-2xl">
      <div className="glow-card relative flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
        <button type="button" onClick={onDismiss} aria-label="Dismiss AI build details"
          className="absolute top-4 right-4 grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-white/[0.08] hover:text-foreground">
          <X className="size-4" aria-hidden />
        </button>
        <div className="flex flex-col gap-1 pr-8">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Wand2 className="size-3.5" aria-hidden /> Built {build.source === 'bedrock' ? 'by AI · Amazon Bedrock' : 'from your goal · offline template'}
          </span>
          <p className="text-sm text-muted-foreground">“{goal}”</p>
          <h3 className="text-2xl font-semibold tracking-tight">{build.name}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{build.summary}</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {build.holdings.map((h, i) => (
            <motion.li key={h.symbol} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
              className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <span className="font-market-data text-sm font-semibold">{Math.round(h.weight * 100)}%</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{h.symbol.replace('/USD', '')}</span>
                <span className="block text-xs leading-5 text-muted-foreground">{h.reason}</span>
              </span>
            </motion.li>
          ))}
        </ul>
        {candidates.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">Backtested {candidates.length} mixes on real prices before choosing:</p>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="text-muted-foreground"><tr>
                  <th className="py-1.5 pr-3 font-medium">Mix</th>
                  <th className="px-3 py-1.5 text-right font-medium">Worst drop</th>
                  <th className="px-3 py-1.5 text-right font-medium">Volatility</th>
                  <th className="py-1.5 pl-3 text-right font-medium">Return</th>
                </tr></thead>
                <tbody>{candidates.map(t => {
                  const picked = key(t.holdings) === chosen
                  return (
                    <tr key={key(t.holdings)} className={cn('border-t border-white/[0.05]', picked && 'text-foreground')}>
                      <td className="py-1.5 pr-3 font-market-data">
                        {picked && <Check className="mr-1 inline size-3.5 text-[var(--positive)]" aria-label="Chosen" />}
                        {t.holdings.map(h => `${h.symbol.replace('/USD', '')} ${Math.round(h.weight * 100)}`).join(' · ')}
                      </td>
                      <td className="px-3 py-1.5 text-right font-market-data">{formatSignedPercent(t.max_drawdown)}</td>
                      <td className="px-3 py-1.5 text-right font-market-data">{formatPercent(t.annualized_volatility)}</td>
                      <td className="py-1.5 pl-3 text-right font-market-data">{formatSignedPercent(t.total_return)}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          </div>
        )}
        <p className="text-[0.7rem] text-muted-foreground">An educational example built from your words, not a recommendation. Past results don't predict future ones.</p>
      </div>
    </div>
  )
}
