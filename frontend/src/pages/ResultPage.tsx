import { motion } from 'motion/react'
import { ArrowDownRight, ArrowRight, ArrowUpRight, GraduationCap, LineChart, Minus, RotateCcw } from 'lucide-react'

import { Reveal } from '@/components/market/motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { allocationToMix, type QuizResult } from '@/services/riskQuiz'
import type { ExperienceLevel, RiskFactor } from '@/types/api'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

const EXPERIENCE: Record<ExperienceLevel, string> = { beginner: 'Beginner', intermediate: 'Intermediate', experienced: 'Experienced' }
const IMPACT: Record<RiskFactor['impact'], { Icon: typeof Minus; text: string; className: string }> = {
  higher_risk: { Icon: ArrowUpRight, text: 'More risk', className: 'text-[var(--risk-aggressive)]' },
  lower_risk: { Icon: ArrowDownRight, text: 'Less risk', className: 'text-[var(--risk-conservative)]' },
  neutral: { Icon: Minus, text: 'Neutral', className: 'text-muted-foreground' },
}
// Validated categorical colors (dataviz checker, dark card surface); every segment is also labelled in text.
const SLICES = [
  { key: 'stocks', label: 'Stocks', color: '#4893dc' },
  { key: 'bonds', label: 'Bonds', color: '#c77f35' },
  { key: 'cash', label: 'Cash', color: '#3aa37c' },
] as const
const FUNDS: Record<string, { name: string; role: string }> = {
  VTI: { name: 'Vanguard Total Stock Market', role: 'US stocks' },
  VXUS: { name: 'Vanguard Total International Stock', role: 'Stocks outside the US' },
  BND: { name: 'Vanguard Total Bond Market', role: 'Bonds' },
  SGOV: { name: 'iShares 0-3 Month Treasury', role: 'Cash-like Treasuries' },
}

export function ResultPage({ result, onContinue, onRetake }: {
  result: QuizResult; onContinue: (mix: Record<string, number>) => void; onRetake: () => void
}) {
  const meta = RISK_PROFILE_META[result.profile]
  const mix = allocationToMix(result.allocation)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Reveal>
        <Card className="glow-card relative gap-4 overflow-hidden">
          <motion.div className="absolute inset-x-0 top-0 h-1" style={{ background: meta.colorVar }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }} aria-hidden />
          <CardHeader className="gap-3">
            <CardDescription>Your risk profile</CardDescription>
            <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-semibold tracking-tight">
                {meta.name}
              </motion.span>
              <span className={cn('text-base font-medium', meta.textClass)}>{meta.tagline}</span>
            </CardTitle>
            <div className="flex items-center gap-2" aria-label={`Risk level ${meta.level} of 3`}>
              {[1, 2, 3].map(step => (
                <motion.span key={step} className="h-2 w-12 rounded-full bg-white/[0.08]"
                  initial={{ opacity: 0.4 }} animate={step <= meta.level ? { opacity: 1, backgroundColor: meta.colorVar } : { opacity: 1 }}
                  transition={{ delay: 0.2 + step * 0.15 }} aria-hidden />
              ))}
              <span className="ml-1 text-xs text-muted-foreground">Level {meta.level} of 3</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="leading-7 text-muted-foreground">{result.explanation}</p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">Your example portfolio</CardTitle>
            <CardDescription>A starting mix for a {meta.name.toLowerCase()} profile, built from real funds you can backtest.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex h-10 gap-[2px] overflow-hidden rounded-xl" role="img"
              aria-label={SLICES.map(s => `${s.label} ${Math.round(result.allocation[s.key] * 100)}%`).join(', ')}>
              {SLICES.filter(s => result.allocation[s.key] > 0).map((s, i) => (
                <motion.div key={s.key} className="flex items-center justify-center text-xs font-semibold text-[#07080a]"
                  style={{ background: s.color }} initial={{ flexGrow: 0.0001 }} animate={{ flexGrow: result.allocation[s.key] }}
                  transition={{ type: 'spring', stiffness: 80, damping: 18, delay: 0.1 + i * 0.1 }}>
                  {result.allocation[s.key] >= 0.1 && `${s.label} ${Math.round(result.allocation[s.key] * 100)}%`}
                </motion.div>
              ))}
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {Object.entries(mix).map(([symbol, weight], i) => (
                <motion.li key={symbol} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] font-market-data text-[0.7rem] font-semibold">{symbol}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{FUNDS[symbol].name}</span>
                    <span className="block text-xs text-muted-foreground">{FUNDS[symbol].role}</span>
                  </span>
                  <span className="font-market-data text-sm font-semibold">{+weight.toFixed(1)}%</span>
                </motion.li>
              ))}
            </ul>
            <Button size="lg" variant="gradient" onClick={() => onContinue(mix)} className="w-full sm:w-auto sm:self-start">
              <LineChart /> See it on real market prices <ArrowRight />
            </Button>
          </CardContent>
        </Card>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Reveal>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base tracking-tight">What shaped this result</CardTitle></CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-white/[0.06]">
                {result.factors.map(f => {
                  const { Icon, text, className } = IMPACT[f.impact]
                  return (
                    <li key={f.questionId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span>{f.label}</span>
                      <span className={cn('flex shrink-0 items-center gap-1 text-xs', className)}>
                        <Icon className="size-3.5" aria-hidden />{text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base tracking-tight"><GraduationCap className="size-4 text-primary" aria-hidden /> {EXPERIENCE[result.experience]}</CardTitle>
              <CardDescription>Experience level</CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Tracked separately from your risk profile: it changes how much we explain, not which portfolio you see.
            </CardContent>
          </Card>
        </Reveal>
      </div>

      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={onRetake}><RotateCcw /> Retake quiz</Button>
        <p className="text-xs text-muted-foreground">Educational starting point, not personalized financial advice.</p>
      </div>
    </div>
  )
}
