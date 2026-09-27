import { useState } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { QuizPage } from '@/pages/QuizPage'
import { ResultPage } from '@/pages/ResultPage'
import { WelcomePage } from '@/pages/WelcomePage'
import { MarketPage } from '@/pages/MarketPage'
import type { RiskAssessmentResult, RiskProfile } from '@/types/api'

/**
 * The demo flow is linear, so a small step machine replaces a router:
 * welcome → quiz → result → dashboard (where the risk profile can be changed).
 */
type Step =
  | { name: 'markets' }
  | { name: 'welcome' }
  | { name: 'quiz' }
  | { name: 'result'; assessment: RiskAssessmentResult }
  | { name: 'dashboard'; riskProfile: RiskProfile }

export default function App() {
  const [step, setStep] = useState<Step>({ name: 'markets' })

  const go = (next: Step) => {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <AppShell
      onHome={() => go({ name: 'welcome' })}
      onMarkets={() => go({ name: 'markets' })}
      onStartAssessment={() => go({ name: 'quiz' })}
      marketsActive={step.name === 'markets'}
    >
      {step.name === 'markets' && <MarketPage />}
      {step.name === 'welcome' && (
        <WelcomePage onStart={() => go({ name: 'quiz' })} onExploreDemo={() => go({ name: 'markets' })} />
      )}

      {step.name === 'quiz' && (
        <QuizPage onComplete={(assessment) => go({ name: 'result', assessment })} />
      )}

      {step.name === 'result' && (
        <ResultPage
          result={step.assessment}
          onRetake={() => go({ name: 'quiz' })}
          onContinue={() => go({ name: 'dashboard', riskProfile: step.assessment.riskProfile })}
        />
      )}

      {step.name === 'dashboard' && (
        <DashboardPage
          riskProfile={step.riskProfile}
          onRiskProfileChange={(riskProfile) => setStep({ name: 'dashboard', riskProfile })}
        />
      )}
    </AppShell>
  )
}

