import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { RISK_QUESTIONS } from '@/content/riskQuestions'
import { cn } from '@/lib/utils'
import { assessRisk, type QuizAnswers, type QuizResult } from '@/services/riskQuiz'

const ADVANCE_MS = 320

export function QuizPage({ onComplete }: { onComplete: (result: QuizResult) => void }) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<number>(undefined)

  const question = RISK_QUESTIONS[index]
  const total = RISK_QUESTIONS.length
  const progress = (Object.keys(answers).length / total) * 100

  const submit = async (all: QuizAnswers) => {
    setSubmitting(true)
    setError('')
    try {
      onComplete(await assessRisk(all))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not score your answers.')
      setSubmitting(false)
    }
  }

  const choose = (optionId: string) => {
    if (submitting) return
    const next = { ...answers, [question.id]: optionId }
    setAnswers(next)
    window.clearTimeout(timer.current)
    // A short pause lets the selection register visually before the next card slides in.
    timer.current = window.setTimeout(() => {
      if (index < total - 1) {
        setDirection(1)
        setIndex(i => i + 1)
      } else {
        void submit(next)
      }
    }, ADVANCE_MS)
  }

  const back = () => {
    window.clearTimeout(timer.current)
    setDirection(-1)
    setIndex(i => Math.max(0, i - 1))
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">Risk quiz · 6 questions · 1 minute</span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">How much risk fits you?</h1>
        <p className="text-base leading-7 text-muted-foreground">
          Answer honestly; there are no wrong answers. You'll get a risk profile and an example portfolio,
          backtested on real market prices.
        </p>
      </motion.header>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {index + 1} of {total}</span>
          <span>{Math.round(progress)}% done</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Quiz progress">
          <motion.div className="bg-gradient-ai h-full rounded-full" animate={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="relative min-h-[26rem]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.fieldset
            key={question.id} custom={direction}
            initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="flex flex-col gap-5" disabled={submitting}
          >
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">{question.category === 'experience' ? 'About you' : 'Comfort with risk'}</span>
              <legend className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">{question.prompt}</legend>
              {question.helpText && <p className="text-sm text-muted-foreground">{question.helpText}</p>}
            </div>
            <div role="radiogroup" aria-label={question.prompt} className="flex flex-col gap-3">
              {question.options.map((option, i) => {
                const selected = answers[question.id] === option.id
                return (
                  <motion.button
                    key={option.id} type="button" role="radio" aria-checked={selected} onClick={() => choose(option.id)}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05 }}
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
                    className={cn(
                      'glass flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors sm:p-5',
                      selected ? 'border-primary/70 bg-primary/[0.12] shadow-lg shadow-primary/10' : 'border-white/[0.08] hover:border-white/20',
                    )}
                  >
                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors',
                      selected ? 'border-primary bg-primary text-primary-foreground' : 'border-white/15 text-muted-foreground')}>
                      {selected ? <Check className="size-4" aria-hidden /> : String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-base">{option.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.fieldset>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={index === 0 || submitting}><ArrowLeft /> Back</Button>
        {submitting && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin text-primary" aria-hidden /> Scoring your answers…</span>}
      </div>
      {error && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">{error} Is the backend running?</p>}
    </div>
  )
}
