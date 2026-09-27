import { FlaskConical, History, Lightbulb, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { USE_MOCKS } from '@/services/api'

/** Tags every data block with where it comes from, so users never confuse the kinds. */
export type DataKind = 'historical' | 'simulated' | 'hypothetical' | 'ai'

const KIND_META: Record<DataKind, { label: string; Icon: typeof History; className: string }> = {
  historical: {
    label: 'Historical data',
    Icon: History,
    className: 'bg-white/5 text-[#c5c9c7] border-white/15',
  },
  simulated: {
    label: 'Simulated portfolio',
    Icon: FlaskConical,
    className: 'bg-primary/10 text-primary border-primary/25',
  },
  hypothetical: {
    label: 'Hypothetical scenario',
    Icon: Lightbulb,
    className: 'bg-amber-950/30 text-amber-200 border-amber-300/25',
  },
  ai: {
    label: 'AI-generated',
    Icon: Sparkles,
    className: 'bg-sky-950/30 text-sky-200 border-sky-300/25',
  },
}

export function DataLabel({ kind, className }: { kind: DataKind; className?: string }) {
  const { label, Icon, className: kindClass } = KIND_META[kind]
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 border px-2 py-0.5 text-[0.65rem] font-medium',
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

