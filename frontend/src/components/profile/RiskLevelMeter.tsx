import { cn } from '@/lib/utils'
import type { RiskProfile } from '@/types/api'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

/** Three-step meter; the text label always accompanies the colour. */
export function RiskLevelMeter({ profile, className }: { profile: RiskProfile; className?: string }) {
  const { level, colorVar, name } = RISK_PROFILE_META[profile]
  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={`Risk level: ${name}`}>
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className="h-1.5 w-6 rounded-sm bg-muted"
            style={step <= level ? { backgroundColor: colorVar } : undefined}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{level} of 3</span>
    </div>
  )
}

