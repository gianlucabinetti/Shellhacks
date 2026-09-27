import { useState } from 'react'
import { motion } from 'motion/react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Share2, Smartphone, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { BenchmarkId, MarketPortfolio } from '@/types/market'
import { formatSignedPercent } from '@/utils/format'
import { isLocalOnly, shareUrl } from '@/utils/share'

export function ShareDialog({ portfolio, benchmark }: { portfolio: MarketPortfolio; benchmark: BenchmarkId | null }) {
  const [copied, setCopied] = useState(false)
  const url = shareUrl(portfolio.request, benchmark)
  const local = isLocalOnly()
  const canNativeShare = typeof navigator.share === 'function'
  const up = portfolio.total_return >= 0
  const title = `My portfolio ${formatSignedPercent(portfolio.total_return)} on real prices`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); the link stays selectable below.
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Share2 /> Share</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg tracking-tight">Share this portfolio</DialogTitle>
          <DialogDescription>Anyone with the link sees the same mix, backtested on live Alpaca prices when they open it.</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="glow-card flex flex-col items-center gap-4 rounded-2xl border border-white/[0.08] p-5"
        >
          <div className="rounded-2xl bg-white p-3 shadow-lg shadow-black/40">
            <QRCodeSVG value={url} size={188} level="M" marginSize={0} bgColor="#ffffff" fgColor="#07080a" title="QR code for the shared portfolio link" />
          </div>
          <p className="flex items-center gap-1.5 text-sm font-medium"><Smartphone className="size-4 text-primary" aria-hidden /> Scan to open on a phone</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {portfolio.positions.map(p => (
              <span key={p.symbol} className="rounded-full bg-white/[0.07] px-2.5 py-0.5 font-market-data text-xs">
                {p.symbol.replace('/USD', '')} {Math.round(p.weight * 100)}%
              </span>
            ))}
          </div>
          <p className={cn('font-market-data text-sm font-semibold', up ? 'text-[var(--positive)]' : 'text-[var(--negative)]')}>
            {formatSignedPercent(portfolio.total_return, 2)} · last {portfolio.request.days === 365 ? 'year' : `${portfolio.request.days} days`}
          </p>
        </motion.div>

        {local && (
          <p className="flex gap-2 rounded-xl border border-amber-300/20 bg-amber-400/[0.07] p-3 text-xs leading-5 text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              This QR points at <code>localhost</code>, which only exists on this computer, so phones can't open it.
              Run <code>npm run tunnel</code> in <code>frontend/</code>, open the <strong>https://…trycloudflare.com</strong> address it
              prints, and share from there. That works on any network, including campus Wi-Fi.
            </span>
          </p>
        )}

        <div className="flex gap-2">
          <input readOnly value={url} aria-label="Share link" onFocus={e => e.currentTarget.select()}
            className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 font-market-data text-xs text-muted-foreground" />
          <Button onClick={() => { void copy() }} variant={copied ? 'secondary' : 'default'} className="w-24">
            {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
          </Button>
        </div>
        {canNativeShare && (
          <Button variant="gradient" onClick={() => { void navigator.share({ title, text: title, url }).catch(() => undefined) }}>
            <Share2 /> Share…
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
