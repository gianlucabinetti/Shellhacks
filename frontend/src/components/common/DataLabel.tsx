import { FlaskConical, History, Lightbulb, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { USE_MOCKS } from '@/services/api'

/** Tags every data block with where it comes from, so users never confuse the kinds. */
export type DataKind = 'historical' | 'simulated' | 'hypothetical' | 'ai'

const KIND_META: Record<DataKind, { label: string; Icon: typeof History; className: string }> = {
  historical: {
    label: 'Historical data',
    Icon: History,
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  simulated: {
    label: 'Simulated portfolio',
    Icon: FlaskConical,
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  hypothetical: {
    label: 'Hypothetical scenario',
    Icon: Lightbulb,
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ai: {
    label: 'AI-generated',
    Icon: Sparkles,
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
}

export function DataLabel({ kind, className }: { kind: DataKind; className?: string }) {
  const { label, Icon, className: kindClass } = KIND_META[kind]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        kindClass,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
      {USE_MOCKS && kind === 'historical' && ' · mock'}
    </span>
  )
}

