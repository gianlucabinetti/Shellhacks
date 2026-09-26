/** Shared tooltip chrome for all charts: surface card, text in ink colours, colour only in the swatch. */
export interface TooltipRow {
  label: string
  value: string
  color?: string
}

export function ChartTooltip({ title, rows }: { title?: string; rows: TooltipRow[] }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {title && <p className="mb-1 font-medium text-foreground">{title}</p>}
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && (
                <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
              )}
              {row.label}
            </span>
            <span className="font-medium tabular-nums text-foreground">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

