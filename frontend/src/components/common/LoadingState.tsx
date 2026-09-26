import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  /** Approximate height of the content being loaded, to avoid layout jump. */
  className?: string
}

export function LoadingState({ label = 'Loading…', className }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-full min-h-24 w-full" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

