import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'

const DEFAULT_TEXT =
  'Market prices are real data from Alpaca. Portfolios are practice backtests: no real money is invested and no trades are placed. For education only, not personalized financial advice. Past performance does not guarantee future results.'

export function Disclaimer({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-xs text-muted-foreground', className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>{children ?? DEFAULT_TEXT}</span>
    </p>
  )
}

