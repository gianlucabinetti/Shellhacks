import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { Question } from '@/types/api'

interface RiskQuestionProps {
  question: Question
  value: string | undefined
  onChange: (optionId: string) => void
}

export function RiskQuestion({ question, value, onChange }: RiskQuestionProps) {
  const headingId = `q-${question.id}`
  return (
    <fieldset className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">
          {question.category === 'experience' ? 'About you' : 'Comfort with risk'}
        </span>
        <legend id={headingId} className="font-editorial text-2xl font-semibold leading-tight sm:text-3xl">
          {question.prompt}
        </legend>
        {question.helpText && <p className="text-sm text-muted-foreground">{question.helpText}</p>}
      </div>
      <RadioGroup value={value ?? ''} onValueChange={onChange} aria-labelledby={headingId}>
        {question.options.map((option) => {
          const id = `${question.id}-${option.id}`
          const selected = value === option.id
          return (
            <label
              key={option.id}
              htmlFor={id}
              className={cn(
                'flex cursor-pointer items-center gap-3 border border-white/15 bg-card p-4 transition-colors hover:border-primary/60 hover:bg-white/[0.03] focus-within:outline-2 focus-within:outline-primary',
                selected && 'border-primary/70 bg-accent ring-1 ring-inset ring-primary/60',
              )}
            >
              <RadioGroupItem id={id} value={option.id} />
              <span className="text-sm sm:text-base">{option.label}</span>
            </label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}

