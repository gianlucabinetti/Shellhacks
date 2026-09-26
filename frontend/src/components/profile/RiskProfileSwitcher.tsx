import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { RiskProfile } from '@/types/api'
import { RISK_PROFILE_META, RISK_PROFILES } from '@/utils/riskProfiles'

interface RiskProfileSwitcherProps {
  current: RiskProfile
  onSelect: (profile: RiskProfile) => void
  disabled?: boolean
}

/** Picking a profile only *requests* a change; the parent shows a confirmation first. */
export function RiskProfileSwitcher({ current, onSelect, disabled }: RiskProfileSwitcherProps) {
  return (
    <div role="radiogroup" aria-label="Risk profile" className="grid grid-cols-3 gap-2">
      {RISK_PROFILES.map((profile) => {
        const meta = RISK_PROFILE_META[profile]
        const active = profile === current
        return (
          <button
            key={profile}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onSelect(profile)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 disabled:opacity-60',
              active && 'border-primary ring-1 ring-primary',
            )}
          >
            <span className="flex w-full items-center justify-between gap-1 text-sm font-medium">
              {meta.name}
              {active && <Check className="size-4 text-primary" aria-hidden />}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">{meta.tagline}</span>
            <span
              className="mt-1 h-1 w-full rounded-full"
              style={{ backgroundColor: meta.colorVar, opacity: active ? 1 : 0.35 }}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

