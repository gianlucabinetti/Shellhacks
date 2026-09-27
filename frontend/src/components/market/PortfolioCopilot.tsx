import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Bot, CornerDownLeft, FlaskConical, Send, Sparkles, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { askPortfolioChat, explainMarketPortfolio } from '@/services/market'
import type { BenchmarkId, ChatMessage, MarketPortfolio, WhatIfResult } from '@/types/market'
import { formatCurrency, formatPercent, formatSignedPercent } from '@/utils/format'

interface UiMessage {
  role: 'user' | 'assistant'
  content: string
  source?: 'bedrock' | 'fallback'
  whatIfs?: WhatIfResult[]
  error?: boolean
}

export interface CopilotQuestion { id: number; text: string }

interface Props {
  open: boolean
  onClose: () => void
  portfolio: MarketPortfolio
  benchmark: BenchmarkId | null
  question: CopilotQuestion | undefined
  stocksConfigured: boolean
  onLoadMix: (holdings: { symbol: string; weight: number }[]) => void
  /** Current diversification score, to compare what-if results against. */
  diversification?: number
}

const short = (symbol: string) => symbol.replace('/USD', '')

/** Bold (**text**) and simple "- " bullet support for model replies; everything else is plain text. */
function RichText({ text }: { text: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong> : part)
  return (
    <div className="flex flex-col gap-2">
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split('\n')
        if (lines.every(l => /^\s*[-*•]\s+/.test(l))) {
          return <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>)}</ul>
        }
        return <p key={i}>{lines.map((l, j) => <span key={j}>{j > 0 && <br />}{inline(l)}</span>)}</p>
      })}
    </div>
  )
}

function Delta({ now, was, lowerIsBetter = false, format }: {
  now: number; was: number; lowerIsBetter?: boolean; format: (v: number) => string
}) {
  const diff = now - was
  if (Math.abs(diff) < 1e-9) return <span className="text-muted-foreground">no change</span>
  const Icon = diff > 0 ? ArrowUp : ArrowDown
  const good = lowerIsBetter ? diff < 0 : diff > 0
  return (
    <span className={cn('inline-flex items-center gap-0.5', good ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
      <Icon className="size-3" aria-hidden />{format(Math.abs(diff))}
      <span className="sr-only">{diff > 0 ? 'higher' : 'lower'} than your portfolio</span>
    </span>
  )
}

function WhatIfCard({ result, portfolio, diversification, onLoad }: {
  result: WhatIfResult; portfolio: MarketPortfolio; diversification: number | undefined; onLoad: () => void
}) {
  const pts = (v: number) => `${(v * 100).toFixed(1)} pts`
  // Drawdowns are negative; a smaller magnitude is better.
  const rows = [
    { label: 'Return', value: formatSignedPercent(result.total_return), delta: <Delta now={result.total_return} was={portfolio.total_return} format={pts} /> },
    { label: 'Volatility', value: formatPercent(result.annualized_volatility), delta: <Delta now={result.annualized_volatility} was={portfolio.annualized_volatility} lowerIsBetter format={pts} /> },
    { label: 'Largest decline', value: formatSignedPercent(result.max_drawdown), delta: <Delta now={Math.abs(result.max_drawdown)} was={Math.abs(portfolio.max_drawdown)} lowerIsBetter format={pts} /> },
    { label: 'Diversification', value: `${result.diversification_score}/100`, delta: diversification == null ? null : <Delta now={result.diversification_score} was={diversification} format={v => `${v.toFixed(0)}`} /> },
  ]
  return (
    <motion.div className="mt-3 overflow-hidden rounded-xl border border-primary/30 bg-black/30"
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}>
      <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/[0.07] px-3 py-2 text-xs">
        <FlaskConical className="size-3.5 text-primary" aria-hidden />
        <span className="font-semibold uppercase tracking-wide text-primary">What-if · recalculated with real prices</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 pt-3">
        {result.holdings.map(h => (
          <span key={h.symbol} className="rounded-full bg-white/[0.07] px-2 py-0.5 font-market-data text-[0.7rem]">
            {short(h.symbol)} {Math.round(h.weight * 100)}%
          </span>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-xs">
        {rows.map(r => (
          <div key={r.label}>
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="flex items-baseline gap-2 font-market-data tabular-nums"><span className="text-sm text-foreground">{r.value}</span>{r.delta}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <span className="text-xs text-muted-foreground">Would end at {formatCurrency(result.final_value, 'USD', 2)}</span>
        <Button size="sm" variant="gradient" onClick={onLoad}>Load this mix</Button>
      </div>
    </motion.div>
  )
}

export function PortfolioCopilot({ open, onClose, portfolio, benchmark, question, stocksConfigured, onLoadMix, diversification }: Props) {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const handled = useRef<number>(undefined)

  const starters = [
    'Which holding drove most of my result?',
    'Why did it fall at its worst?',
    benchmark ? 'How did I do against the benchmark?' : 'What does volatility actually mean?',
    stocksConfigured && !portfolio.positions.some(p => p.symbol === 'BND')
      ? 'What if I moved 30% into bonds (BND)?' : 'What if I held only Bitcoin instead?',
  ]
  const chips = suggestions.length ? suggestions : starters

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, busy])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const history: UiMessage[] = [...messages.filter(m => !m.error), { role: 'user', content }]
    setMessages(history)
    setDraft('')
    setBusy(true)
    try {
      const payload: ChatMessage[] = history.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 2000) }))
      const reply = await askPortfolioChat(portfolio.request, benchmark, payload)
      if (reply.data_id !== portfolio.data_id) throw new Error('Prices were refreshed since this analysis. Select Analyze portfolio again, then ask.')
      setMessages(m => [...m, { role: 'assistant', content: reply.reply, source: reply.source, whatIfs: reply.what_ifs }])
      setSuggestions(reply.suggestions)
    } catch (error) {
      setMessages(m => [...m, { role: 'assistant', content: error instanceof Error ? error.message : 'Something went wrong.', error: true }])
    } finally {
      setBusy(false)
    }
  }

  const overview = async () => {
    if (busy) return
    setMessages(m => [...m, { role: 'user', content: 'Give me the 30-second overview.' }])
    setBusy(true)
    try {
      const result = await explainMarketPortfolio(portfolio.request)
      if (result.data_id !== portfolio.data_id) throw new Error('Prices were refreshed since this analysis. Select Analyze portfolio again.')
      const e = result.explanation
      setMessages(m => [...m, {
        role: 'assistant', source: result.source,
        content: `${e.summary} ${e.allocation_explanation}\n\n${e.risk_explanation}\n\n**Beginner tip:** ${e.beginner_tip}`,
      }])
    } catch (error) {
      setMessages(m => [...m, { role: 'assistant', content: error instanceof Error ? error.message : 'Something went wrong.', error: true }])
    } finally {
      setBusy(false)
    }
  }

  // Questions sent from "Ask the AI" buttons elsewhere on the page.
  useEffect(() => {
    if (!question || handled.current === question.id) return
    handled.current = question.id
    void send(question.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="scrim" className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden" onClick={onClose} aria-hidden
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      )}
      {open && (
      <motion.aside
        key="drawer" aria-label="AI portfolio copilot"
        initial={{ x: '100%', opacity: 0.6 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.6 }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="glass fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-white/[0.08] shadow-2xl shadow-black/60 sm:w-[440px]"
      >
        <header className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5">
          <span className="bg-gradient-ai grid size-9 place-items-center rounded-xl text-[#07080a] shadow-lg shadow-[#7cb4ff]/20"><Bot className="size-5" aria-hidden /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Portfolio copilot</p>
            <p className="truncate text-xs text-muted-foreground">Answers from your calculated results · Amazon Bedrock</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close copilot"><X /></Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin" aria-live="polite">
          {messages.length === 0 && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-sm leading-6">
                <p className="font-medium">Ask anything about this portfolio.</p>
                <p className="mt-1 text-muted-foreground">
                  I explain the numbers on this page and can test <span className="text-foreground">what-if</span> mixes
                  against the same real price history. I can't predict the future or tell you what to buy.
                </p>
              </div>
              <Button variant="gradient" onClick={() => { void overview() }} className="self-start"><Sparkles /> Give me the 30-second overview</Button>
            </div>
          )}
          <ol className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <motion.li key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}
                initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
                <div className={cn(
                  'max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-6',
                  m.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : m.error ? 'rounded-bl-md border border-destructive/40 bg-destructive/10' : 'rounded-bl-md border border-white/[0.07] bg-white/[0.04]',
                )}>
                  {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
                  {m.whatIfs?.map((w, j) => (
                    <WhatIfCard key={j} result={w} portfolio={portfolio} diversification={diversification}
                      onLoad={() => { onLoadMix(w.holdings); onClose() }} />
                  ))}
                </div>
                {m.source && (
                  <span className="mt-1 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                    {m.source === 'bedrock' ? 'AI · Amazon Bedrock' : 'Offline answer · AI unavailable'}
                  </span>
                )}
              </motion.li>
            ))}
            {busy && (
              <li className="flex items-center gap-1 px-1" aria-label="Copilot is thinking">
                {[0, 1, 2].map(d => <span key={d} className="typing-dot size-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 150}ms` }} />)}
              </li>
            )}
          </ol>
          <div ref={endRef} />
        </div>

        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {chips.map(s => (
              <button key={s} type="button" disabled={busy} onClick={() => { void send(s) }}
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
          <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); void send(draft) }}>
            <label className="sr-only" htmlFor="copilot-input">Ask about your portfolio</label>
            <textarea
              id="copilot-input" ref={inputRef} rows={1} maxLength={2000} value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(draft) } }}
              placeholder="e.g. What if I swapped SOL for bonds?"
              className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            />
            <Button type="submit" size="icon" disabled={busy || !draft.trim()} aria-label="Send question"><Send /></Button>
          </form>
          <p className="mt-1.5 flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <CornerDownLeft className="size-3" aria-hidden /> Enter to send · Educational only, not financial advice
          </p>
        </div>
      </motion.aside>
      )}
    </AnimatePresence>
  )
}
