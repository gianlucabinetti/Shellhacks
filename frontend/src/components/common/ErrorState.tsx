import { AlertTriangle, RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  error?: Error
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = "We couldn't load this",
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        {error && <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  )
}

