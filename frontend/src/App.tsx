import { useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { MarketPage, type MarketPreset } from '@/pages/MarketPage'
import { QuizPage } from '@/pages/QuizPage'
import { ResultPage } from '@/pages/ResultPage'
import type { QuizResult } from '@/services/riskQuiz'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

/**
 * A small step machine instead of a router: markets (home) ⇄ quiz → result → markets with
 * the quiz's example portfolio loaded on real prices.
 */
type Step =
  | { name: 'markets'; preset?: MarketPreset }
  | { name: 'quiz' }
  | { name: 'result'; result: QuizResult }

export default function App() {
  const [step, setStep] = useState<Step>({ name: 'markets' })

  const go = (next: Step) => {
    // The address bar carries the Markets portfolio; clear it elsewhere so a reload or shared link stays accurate.
    if (next.name !== 'markets' && window.location.search) window.history.replaceState(null, '', window.location.pathname)
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <AppShell
      section={step.name === 'markets' ? 'markets' : 'quiz'}
      onMarkets={() => go({ name: 'markets' })}
      onQuiz={() => go({ name: 'quiz' })}
      wide={step.name === 'markets'}
    >
      {step.name === 'markets' && <MarketPage key={step.preset?.label ?? 'home'} preset={step.preset} />}
      {step.name === 'quiz' && <QuizPage onComplete={result => go({ name: 'result', result })} />}
      {step.name === 'result' && (
        <ResultPage
          result={step.result}
          onRetake={() => go({ name: 'quiz' })}
          onContinue={mix => go({
            name: 'markets',
            preset: { weights: mix, label: `${RISK_PROFILE_META[step.result.profile].name} profile from your risk quiz` },
          })}
        />
      )}
    </AppShell>
  )
}
