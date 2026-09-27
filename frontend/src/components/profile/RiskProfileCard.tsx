import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RiskProfile } from '@/types/api'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'
import { RiskLevelMeter } from './RiskLevelMeter'

interface RiskProfileCardProps {
  profile: RiskProfile
  eyebrow?: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function RiskProfileCard({
  profile,
  eyebrow = 'Your risk profile',
  description,
  children,
  className,
}: RiskProfileCardProps) {
  const meta = RISK_PROFILE_META[profile]
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="-mt-5 h-1" style={{ backgroundColor: meta.colorVar }} aria-hidden />
      <CardHeader>
        <CardDescription>{eyebrow}</CardDescription>
        <CardTitle className="font-editorial flex flex-wrap items-baseline gap-x-3 gap-y-1 text-4xl uppercase">
          {meta.name}
          <span className={cn('font-sans text-sm font-medium normal-case', meta.textClass)}>{meta.tagline}</span>
        </CardTitle>
        <RiskLevelMeter profile={profile} className="mt-1" />
      </CardHeader>
      {(description || children) && (
        <CardContent className="flex flex-col gap-4">
          {description && <p className="text-muted-foreground">{description}</p>}
          {children}
        </CardContent>
      )}
    </Card>
  )
}

