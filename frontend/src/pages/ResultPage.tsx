import { ArrowDownRight, ArrowRight, ArrowUpRight, GraduationCap, Minus, RotateCcw } from 'lucide-react'

import { Disclaimer } from '@/components/common/Disclaimer'
import { MockDataNotice } from '@/components/common/MockDataNotice'
import { RiskProfileCard } from '@/components/profile/RiskProfileCard'
import { Button } from '@/components/ui/button'
import type { ExperienceLevel, RiskAssessmentResult, RiskFactor } from '@/types/api'

interface ResultPageProps {
  result: RiskAssessmentResult
  onContinue: () => void
  onRetake: () => void
}

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
}

const IMPACT_META: Record<RiskFactor['impact'], { Icon: typeof Minus; text: string }> = {
  higher_risk: { Icon: ArrowUpRight, text: 'Points toward more risk' },
  lower_risk: { Icon: ArrowDownRight, text: 'Points toward less risk' },
  neutral: { Icon: Minus, text: 'Neutral' },
}

export function ResultPage({ result, onContinue, onRetake }: ResultPageProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <RiskProfileCard profile={result.riskProfile} description={result.summary}>
        {result.factors.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-medium">What shaped this result</h2>
            <ul className="flex flex-col divide-y rounded-lg border">
              {result.factors.map((factor) => {
                const { Icon, text } = IMPACT_META[factor.impact]
                return (
                  <li key={factor.questionId} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>{factor.label}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Icon className="size-3.5" aria-hidden />
                      <span className="hidden sm:inline">{text}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </RiskProfileCard>

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
        <GraduationCap className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="text-sm">
          <p className="font-medium">Experience level: {EXPERIENCE_LABELS[result.experienceLevel]}</p>
          <p className="text-muted-foreground">
            This is tracked separately from your risk profile. It only changes how much we explain,
            not which portfolio you see.
          </p>
        </div>
      </div>

      <MockDataNotice>
        Demo mode: this is a predefined example result and does not depend on your answers.
      </MockDataNotice>

      <Disclaimer>{result.disclaimer}</Disclaimer>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onRetake}>
          <RotateCcw /> Retake quiz
        </Button>
        <Button size="lg" onClick={onContinue}>
          View my example portfolio <ArrowRight />
        </Button>
      </div>
    </div>
  )
}

