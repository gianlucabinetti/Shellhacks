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
      <div className="h-1.5 -mt-6" style={{ backgroundColor: meta.colorVar }} aria-hidden />
      <CardHeader>
        <CardDescription>{eyebrow}</CardDescription>
        <CardTitle className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-3xl">
          {meta.name}
          <span className={cn('text-base font-medium', meta.textClass)}>{meta.tagline}</span>
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

