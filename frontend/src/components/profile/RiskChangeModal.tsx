import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

import { AllocationComparisonChart } from '@/components/charts/AllocationComparisonChart'
import { DataLabel } from '@/components/common/DataLabel'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { RiskMetrics } from '@/components/dashboard/RiskMetrics'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAsync } from '@/hooks/useAsync'
import { cn } from '@/lib/utils'
import { getAnalytics, getPortfolio, updateRiskProfile } from '@/services/api'
import type { Portfolio, PortfolioAnalytics, RiskProfile } from '@/types/api'
import { formatMonthYear } from '@/utils/format'
import { RISK_PROFILE_META } from '@/utils/riskProfiles'

interface RiskChangeModalProps {
  current: { portfolio: Portfolio; analytics: PortfolioAnalytics }
  target: RiskProfile | null
  onCancel: () => void
  onConfirmed: (profile: RiskProfile) => void
}

function warningText(from: RiskProfile, to: RiskProfile): string {
  const fromName = RISK_PROFILE_META[from].name
  const toName = RISK_PROFILE_META[to].name
  const moreRisk = RISK_PROFILE_META[to].level > RISK_PROFILE_META[from].level
  return moreRisk
    ? `You are changing from ${fromName} to ${toName}. This example portfolio has higher stock exposure and may experience larger losses during market downturns.`
    : `You are changing from ${fromName} to ${toName}. This example portfolio has lower stock exposure: it may fall less in downturns, but it may also grow more slowly over time.`
}

export function RiskChangeModal({ current, target, onCancel, onConfirmed }: RiskChangeModalProps) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-2xl">
        {target && (
          <RiskChangeBody key={target} current={current} target={target} onCancel={onCancel} onConfirmed={onConfirmed} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RiskChangeBody({
  current,
  target,
  onCancel,
  onConfirmed,
}: RiskChangeModalProps & { target: RiskProfile }) {
  const from = current.portfolio.riskProfile
  const proposed = useAsync(
    () => Promise.all([getPortfolio(target), getAnalytics(target)]),
    [target],
  )
  const [acknowledged, setAcknowledged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<Error>()

  const confirm = async () => {
    setSaving(true)
    setSaveError(undefined)
    try {
      await updateRiskProfile(target)
      onConfirmed(target)
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error('Could not update your risk profile.'))
      setSaving(false)
    }
  }

  const moreRisk = RISK_PROFILE_META[target].level > RISK_PROFILE_META[from].level
  const [proposedPortfolio, proposedAnalytics] = proposed.data ?? []

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          Switch to {RISK_PROFILE_META[target].name}?
        </DialogTitle>
        <DialogDescription>
          Review how the example portfolio and its historical risk would change.
        </DialogDescription>
      </DialogHeader>

      <div
        role="alert"
        className={cn(
          'flex items-start gap-3 rounded-lg border p-4 text-sm',
          moreRisk ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50',
        )}
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>{warningText(from, target)}</p>
      </div>

      {proposed.loading && <LoadingState label="Loading comparison" className="h-64" />}
      {proposed.error && <ErrorState error={proposed.error} onRetry={proposed.retry} />}
      {proposedPortfolio && proposedAnalytics && (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Allocation</h3>
              <DataLabel kind="simulated" />
            </div>
            <AllocationComparisonChart
              current={current.portfolio.allocation}
              proposed={proposedPortfolio.allocation}
              currentLabel={`Now: ${RISK_PROFILE_META[from].name}`}
              proposedLabel={`After: ${RISK_PROFILE_META[target].name}`}
            />
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                Historical risk ({formatMonthYear(proposedAnalytics.periodStart)} –{' '}
                {formatMonthYear(proposedAnalytics.periodEnd)})
              </h3>
              <DataLabel kind="historical" />
            </div>
            <RiskMetrics
              analytics={current.analytics}
              proposed={proposedAnalytics}
              currentLabel={RISK_PROFILE_META[from].name}
              compact
            />
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            <span>
              I understand this is an illustrative example, past performance does not guarantee
              future results, and this is not financial advice.
            </span>
          </label>
        </div>
      )}

      {saveError && <ErrorState title="Your change was not saved" error={saveError} />}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Keep {RISK_PROFILE_META[from].name}
        </Button>
        <Button onClick={confirm} disabled={!acknowledged || saving || !proposed.data}>
          {saving && <Loader2 className="animate-spin" />}
          Confirm {RISK_PROFILE_META[target].name}
        </Button>
      </DialogFooter>
    </>
  )
}

