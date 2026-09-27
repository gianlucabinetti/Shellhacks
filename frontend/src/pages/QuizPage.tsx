import { useState } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { RiskQuiz } from '@/components/quiz/RiskQuiz'
import { useAsync } from '@/hooks/useAsync'
import { getQuestionnaire, submitRiskAssessment } from '@/services/api'
import type { QuestionAnswer, RiskAssessmentResult } from '@/types/api'

interface QuizPageProps {
  onComplete: (result: RiskAssessmentResult) => void
}

export function QuizPage({ onComplete }: QuizPageProps) {
  const { data: questionnaire, error, loading, retry } = useAsync(getQuestionnaire, [])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<Error>()

  const handleSubmit = async (answers: QuestionAnswer[]) => {
    if (!questionnaire) return
    setSubmitting(true)
    setSubmitError(undefined)
    try {
      const result = await submitRiskAssessment({
        questionnaireId: questionnaire.questionnaireId,
        answers,
      })
      onComplete(result)
    } catch (err) {
      setSubmitError(err instanceof Error ? err : new Error('Could not submit your answers.'))
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow">Portfolio simulator / Risk assessment</p>
        <h1 className="font-editorial mt-2 text-4xl font-semibold uppercase leading-none sm:text-5xl">Your risk profile quiz</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          A few quick questions. Answer honestly: there are no wrong answers.
        </p>
      </div>

      {loading && <LoadingState label="Loading questions" className="h-72" />}
      {error && <ErrorState error={error} onRetry={retry} />}
      {questionnaire && questionnaire.questions.length === 0 && (
        <ErrorState title="No questions available right now" onRetry={retry} />
      )}
      {questionnaire && questionnaire.questions.length > 0 && (
        <RiskQuiz questionnaire={questionnaire} submitting={submitting} onSubmit={handleSubmit} />
      )}
      {submitError && (
        <ErrorState title="We couldn't calculate your profile" error={submitError} />
      )}
    </div>
  )
}

