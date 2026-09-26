import { useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { QuestionAnswer, Questionnaire } from '@/types/api'
import { RiskQuestion } from './RiskQuestion'

interface RiskQuizProps {
  questionnaire: Questionnaire
  submitting: boolean
  onSubmit: (answers: QuestionAnswer[]) => void
}

/** Collects answers one question at a time. Scoring happens on the backend. */
export function RiskQuiz({ questionnaire, submitting, onSubmit }: RiskQuizProps) {
  const { questions } = questionnaire
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const question = questions[index]
  const isLast = index === questions.length - 1
  const answered = answers[question.id] !== undefined
  const progress = ((index + (answered ? 1 : 0)) / questions.length) * 100

  const next = () => {
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    onSubmit(questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] })))
  }

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <span className="shrink-0 text-sm text-muted-foreground">
          Question {index + 1} of {questions.length}
        </span>
        <Progress value={progress} aria-label="Quiz progress" />
      </div>
      <CardContent className="py-6 sm:py-8">
        <RiskQuestion
          key={question.id}
          question={question}
          value={answers[question.id]}
          onChange={(optionId) => setAnswers((a) => ({ ...a, [question.id]: optionId }))}
        />
      </CardContent>
      <CardFooter className="justify-between border-t py-4">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => i - 1)}
          disabled={index === 0 || submitting}
        >
          <ArrowLeft /> Back
        </Button>
        <Button onClick={next} disabled={!answered || submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" /> Analyzing…
            </>
          ) : isLast ? (
            <>
              See my risk profile <ArrowRight />
            </>
          ) : (
            <>
              Next <ArrowRight />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

