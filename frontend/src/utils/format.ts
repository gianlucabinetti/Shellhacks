/** Display formatting only; no financial calculations live in the frontend. */

export function formatCurrency(value: number, currency = 'USD', maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value)
}

export function formatCompactCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** 0.123 -> "12.3%" */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${(value * 100).toFixed(fractionDigits)}%`
}

/** 0.123 -> "+12.3%", -0.05 -> "−5.0%" */
export function formatSignedPercent(value: number, fractionDigits = 1): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value * 100).toFixed(fractionDigits)}%`
}

/** "2026-08-31" -> "Aug 2026" */
export function formatMonthYear(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

