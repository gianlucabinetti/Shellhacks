import { FlaskConical } from 'lucide-react'

import { USE_MOCKS } from '@/services/api'

/** Renders only in mock mode, so fictional numbers are never mistaken for real data. */
export function MockDataNotice({ children }: { children: React.ReactNode }) {
  if (!USE_MOCKS) return null
  return (
    <p className="flex items-start gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 p-3 text-sm text-violet-950">
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

