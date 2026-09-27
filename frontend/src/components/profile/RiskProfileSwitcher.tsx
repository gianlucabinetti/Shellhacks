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
    <div role="radiogroup" aria-label="Risk profile" className="grid grid-cols-3 gap-px border border-white/15 bg-white/15">
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
              'flex min-h-24 flex-col items-start gap-1 bg-[#181b1d] p-3 text-left transition-colors hover:bg-[#222729] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60 sm:p-4',
              active && 'bg-[#243545] ring-1 ring-inset ring-primary',
            )}
          >
            <span className="flex w-full items-center justify-between gap-1 text-sm font-medium">
              <span className="font-editorial text-lg uppercase">{meta.name}</span>
              {active && <Check className="size-4 text-primary" aria-hidden />}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">{meta.tagline}</span>
            <span
              className="mt-2 h-1 w-full"
              style={{ backgroundColor: meta.colorVar, opacity: active ? 1 : 0.35 }}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

