import { ArrowRight, BookOpen, Landmark, Layers, TrendingUp } from 'lucide-react'

import { HeroBackgroundVideo } from '@/components/common/HeroBackgroundVideo'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    index: '01',
    title: 'Map your risk comfort',
    body: 'Answer a few clear questions about your goals and how you respond to market swings.',
  },
  {
    index: '02',
    title: 'Get a profile to explore',
    body: 'See whether a conservative, moderate, or aggressive approach fits your answers.',
  },
  {
    index: '03',
    title: 'Compare the trade-offs',
    body: 'Explore an illustrative portfolio and see how different risk choices change its behavior.',
  },
]

const EDUCATION = [
  {
    name: 'Stocks',
    Icon: TrendingUp,
    risk: 'Higher risk',
    color: 'text-[var(--negative)]',
    summary: 'A share represents partial ownership in a company.',
    details: 'People use stocks to participate in company growth. Prices can move sharply, and returns are not guaranteed.',
  },
  {
    name: 'Bonds',
    Icon: Landmark,
    risk: 'Lower to moderate',
    color: 'text-[var(--primary)]',
    summary: 'A bond is a loan to a government or company.',
    details: 'Investors may use bonds for income and diversification. Bond prices and payments still carry interest-rate and credit risks.',
  },
  {
    name: 'ETFs',
    Icon: Layers,
    risk: 'Varies by holdings',
    color: 'text-[var(--positive)]',
    summary: 'An exchange-traded fund holds a collection of investments.',
    details: 'People use ETFs to access a basket of assets through one fund. An ETF can still lose value, depending on what it owns.',
  },
]

export function WelcomePage({ onStart, onExploreDemo }: { onStart: () => void; onExploreDemo: () => void }) {
  return (
    <div className="flex flex-col gap-14 py-2 sm:gap-20 sm:py-4">
      <section className="welcome-bleed relative isolate overflow-hidden border-y border-white/10 bg-[#101416]">
        <HeroBackgroundVideo />
        <div className="relative z-10 mx-auto grid min-h-[34rem] max-w-[1440px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-24">
          <div className="enter-up max-w-3xl">
            <p className="eyebrow mb-5 flex items-center gap-3"><span className="size-2 bg-[var(--positive)]" aria-hidden /> Financial literacy / Portfolio lab</p>
            <h1 className="font-editorial max-w-[13ch] text-6xl font-semibold uppercase leading-[0.88] tracking-normal text-balance sm:text-7xl lg:text-8xl">
              Understand your risk. <span className="text-[#aeb6b6]">See your portfolio differently.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#c0c5c3] sm:text-lg">
              Learn what risk can mean for your investments, then explore how an illustrative portfolio may respond to market history.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={onStart} className="h-12 rounded-none px-6 text-sm font-bold uppercase tracking-wide">
                Start risk assessment <ArrowRight aria-hidden />
              </Button>
              <Button size="lg" variant="outline" onClick={onExploreDemo} className="h-12 rounded-none border-white/25 bg-transparent px-6 text-sm uppercase tracking-wide text-foreground hover:bg-white/10 hover:text-foreground">
                Explore market portfolios
              </Button>
            </div>
            <p className="mt-4 font-market-data text-[0.62rem] uppercase text-muted-foreground">About 2 minutes · No sign-up · Educational use only</p>
          </div>

          <div className="enter-up-delay relative hidden min-h-[23rem] lg:block" aria-hidden="true">
            <div className="absolute inset-x-0 top-8 border-y border-white/15 bg-[#101416]/75 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="eyebrow">Illustrative portfolio index</span>
                <span className="font-market-data text-xs text-[var(--positive)]">+8.3%</span>
              </div>
              <svg viewBox="0 0 640 260" className="mt-4 h-[16rem] w-full overflow-visible" preserveAspectRatio="none">
                <g stroke="#ffffff1a" strokeWidth="1">
                  <path d="M0 40H640M0 95H640M0 150H640M0 205H640" />
                  <path d="M80 0V260M200 0V260M320 0V260M440 0V260M560 0V260" />
                </g>
                <path d="M0 204 C38 192 42 176 79 181 S116 153 145 166 S186 122 218 141 S256 118 285 130 S330 94 355 112 S395 89 422 98 S455 66 488 83 S525 54 553 66 S601 43 640 28" fill="none" stroke="#75b7ff" strokeWidth="2.5" className="market-line" />
                <path d="M0 204 C38 192 42 176 79 181 S116 153 145 166 S186 122 218 141 S256 118 285 130 S330 94 355 112 S395 89 422 98 S455 66 488 83 S525 54 553 66 S601 43 640 28 V260 H0Z" fill="url(#hero-area)" opacity="0.35" />
                <defs><linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#75b7ff" stopOpacity="0.32" /><stop offset="100%" stopColor="#75b7ff" stopOpacity="0" /></linearGradient></defs>
                <circle cx="640" cy="28" r="4" fill="#75b7ff" />
              </svg>
              <div className="mt-1 flex justify-between font-market-data text-[0.58rem] text-muted-foreground"><span>2019</span><span>2021</span><span>2023</span><span>2025</span></div>
            </div>
            <span className="absolute right-0 top-0 font-market-data text-[0.62rem] text-white/30">SPX / SAMPLE SERIES</span>
            <span className="absolute bottom-4 left-0 font-market-data text-[0.62rem] text-white/30">HYPOTHETICAL · NOT A FORECAST</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" aria-hidden />
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 sm:grid-cols-[0.7fr_1.3fr] sm:gap-12" aria-labelledby="approach-title">
        <div>
          <p className="eyebrow">The process</p>
          <h2 id="approach-title" className="font-editorial mt-3 text-4xl font-semibold uppercase leading-none sm:text-5xl">A clearer view of risk</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">A guided introduction to portfolio trade-offs, built for learning rather than trading.</p>
        </div>
        <ol className="divide-y divide-white/15 border-y border-white/15">
          {STEPS.map(({ index, title, body }) => (
            <li key={title} className="grid gap-2 py-5 sm:grid-cols-[4rem_1fr] sm:gap-4">
              <span className="font-market-data text-sm text-primary">{index}</span>
              <div><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="welcome-bleed market-feature-grid overflow-hidden bg-[#e9e7df] text-[#171a1b]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-14 lg:px-14">
          <div>
            <p className="font-market-data text-[0.68rem] uppercase tracking-wide text-[#51595a]">Portfolio simulator / Market behavior</p>
            <h2 className="font-editorial mt-4 max-w-[12ch] text-5xl font-semibold uppercase leading-[0.92] sm:text-6xl">Markets move. Context matters.</h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#454b4b]">Explore how a hypothetical mix of investments has moved over time, and learn what measures like volatility and drawdown can tell you.</p>
            <Button variant="outline" onClick={onExploreDemo} className="mt-6 h-11 rounded-none border-[#323839] bg-transparent px-5 text-xs font-bold uppercase tracking-wide text-[#171a1b] hover:bg-[#171a1b] hover:text-[#f0eee8]">
              Open the portfolio lab <ArrowRight aria-hidden />
            </Button>
          </div>
          <div className="relative min-h-[17rem] overflow-hidden border border-[#9fa3a0] bg-[#dcded9] sm:min-h-[22rem]" aria-label="Illustrative market chart visualization">
            <svg viewBox="0 0 900 360" className="absolute inset-0 size-full" role="img" aria-label="A stylized, illustrative market line and volume bars">
              <g stroke="#737b7a" strokeOpacity=".22" strokeWidth="1">
                <path d="M0 60H900M0 120H900M0 180H900M0 240H900M0 300H900" />
                <path d="M90 0V360M180 0V360M270 0V360M360 0V360M450 0V360M540 0V360M630 0V360M720 0V360M810 0V360" />
              </g>
              <g fill="#759982" fillOpacity=".55">
                <rect x="45" y="294" width="24" height="42" /><rect x="116" y="276" width="24" height="60" /><rect x="187" y="302" width="24" height="34" />
                <rect x="258" y="250" width="24" height="86" /><rect x="329" y="265" width="24" height="71" /><rect x="400" y="228" width="24" height="108" />
                <rect x="471" y="244" width="24" height="92" /><rect x="542" y="206" width="24" height="130" /><rect x="613" y="221" width="24" height="115" />
                <rect x="684" y="172" width="24" height="164" /><rect x="755" y="194" width="24" height="142" /><rect x="826" y="137" width="24" height="199" />
              </g>
              <path d="M0 228 C55 218 73 198 118 207 S177 188 218 201 S276 158 320 176 S375 152 416 163 S477 121 519 140 S574 122 612 129 S672 89 713 108 S770 78 804 89 S856 56 900 44" fill="none" stroke="#176d58" strokeWidth="3" className="market-line" />
              <circle cx="900" cy="44" r="6" fill="#176d58" />
            </svg>
            <div className="absolute left-4 top-4 flex items-center gap-2 bg-[#e9e7df]/90 px-3 py-2 font-market-data text-[0.62rem] uppercase text-[#3e4746]">
              <span className="size-2 bg-[#176d58]" aria-hidden /> Illustrative market series
            </div>
            <span className="absolute bottom-3 right-4 font-market-data text-[0.58rem] uppercase text-[#51595a]">Sample data · Not live</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl" aria-labelledby="learn-title">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-white/15 pb-5 sm:flex-row sm:items-end">
          <div><p className="eyebrow">Investment basics</p><h2 id="learn-title" className="font-editorial mt-2 text-4xl font-semibold uppercase leading-none sm:text-5xl">Know the building blocks</h2></div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">A simple starting point. These descriptions are educational, not recommendations.</p>
        </div>
        <div className="grid gap-px border border-white/15 bg-white/15 md:grid-cols-3">
          {EDUCATION.map(({ name, Icon, risk, color, summary, details }) => (
            <article key={name} className="flex min-h-[16rem] flex-col bg-[#151819] p-5 sm:p-6">
              <div className="flex items-center justify-between"><Icon className="size-5 text-primary" aria-hidden /><span className={`font-market-data text-[0.6rem] uppercase ${color}`}>{risk}</span></div>
              <h3 className="font-editorial mt-6 text-3xl font-semibold uppercase">{name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p>
              <details className="group mt-auto border-t border-white/10 pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wide text-foreground focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="flex items-center gap-2"><BookOpen className="size-4 text-primary" aria-hidden /> Learn more</span>
                  <span className="font-market-data text-primary group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="pt-3 text-sm leading-6 text-muted-foreground">{details}</p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
