import { ArrowRight, BarChart3, ClipboardList, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'

const STEPS = [
  {
    Icon: ClipboardList,
    title: 'Take a short quiz',
    body: 'Answer a few questions about your goals and how you feel about ups and downs.',
  },
  {
    Icon: ShieldCheck,
    title: 'Get your risk profile',
    body: 'See whether a conservative, moderate or aggressive approach fits your answers.',
  },
  {
    Icon: BarChart3,
    title: 'Explore a simulated portfolio',
    body: 'See how an example portfolio would have behaved in the past, with no real money involved.',
  },
]

export function WelcomePage({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col gap-12 py-4 sm:py-10">
      <section className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Learn investing without risking a cent
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Understand risk before you invest
        </h1>
        <p className="text-lg text-muted-foreground text-balance">
          Find your comfort level with risk, then see how an example portfolio built for it has
          behaved through real market ups and downs, explained in plain language.
        </p>
        <div className="flex flex-col items-center gap-2">
          <Button size="lg" onClick={onStart}>
            Take the risk quiz <ArrowRight />
          </Button>
          <span className="text-xs text-muted-foreground">About 2 minutes · no sign-up</span>
        </div>
      </section>

      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, body }, i) => (
          <li key={title} className="flex flex-col gap-3 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

