import { FlaskConical } from 'lucide-react'

import { USE_MOCKS } from '@/services/api'

/** Renders only in mock mode, so fictional numbers are never mistaken for real data. */
export function MockDataNotice({ children }: { children: React.ReactNode }) {
  if (!USE_MOCKS) return null
  return (
    <p className="flex items-start gap-2 border border-dashed border-primary/30 bg-primary/[0.06] p-3 text-sm text-[#d2e7fb]">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

