import { useEffect, useState } from 'react'
import NumberFlow, { type Format } from '@number-flow/react'
import { motion, type HTMLMotionProps } from 'motion/react'

import { cn } from '@/lib/utils'

/** Fades and lifts content in the first time it scrolls into view. */
export function Reveal({ delay = 0, className, ...props }: HTMLMotionProps<'div'> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, delay }}
      className={className}
      {...props}
    />
  )
}

/** Number that rolls from `from` to `value` on mount, then animates every change. */
export function CountUp({ value, from, format, className, prefix, suffix }: {
  value: number; from?: number; format?: Format; className?: string; prefix?: string; suffix?: string
}) {
  const [shown, setShown] = useState(from ?? value)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(id)
  }, [value])
  return <NumberFlow value={shown} format={format} className={className} prefix={prefix} suffix={suffix} locales="en-US" />
}

export interface SegmentOption<T> { value: T; label: string; disabled?: boolean; title?: string }

/** Radio-style segmented control with a spring-animated selection pill. */
export function Segmented<T extends string | number | null>({ id, label, options, value, onChange, className, size = 'md' }: {
  id: string; label: string; options: SegmentOption<T>[]; value: T; onChange: (v: T) => void; className?: string; size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label}
      className={cn('inline-flex rounded-xl border border-white/[0.07] bg-white/[0.03] p-1', className)}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)} type="button" role="radio" aria-checked={active} disabled={option.disabled}
            title={option.title} onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35',
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-3.5 text-sm',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-white/[0.1] shadow-sm" />}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
