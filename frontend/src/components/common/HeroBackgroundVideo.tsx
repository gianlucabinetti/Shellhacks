import { lazy, Suspense, useEffect, useState } from 'react'

const HtmlPlayer = lazy(() => import('react-player/HtmlPlayer'))

const VIDEO_PATH = '/videos/market-hero.mp4'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function HeroBackgroundVideo() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
  )
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const updatePreference = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches)

    mediaQuery.addEventListener('change', updatePreference)
    return () => mediaQuery.removeEventListener('change', updatePreference)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#101416]" aria-hidden="true">
      <div className="market-grid absolute inset-0 opacity-50" />
      <svg className="absolute inset-0 size-full opacity-45" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMid slice">
        <g stroke="#c5d3d2" strokeOpacity=".3" strokeWidth="1">
          <path d="M0 120H1440M0 240H1440M0 360H1440M0 480H1440M0 600H1440" />
          <path d="M120 0V700M360 0V700M600 0V700M840 0V700M1080 0V700M1320 0V700" />
        </g>
        <path d="M0 520 C90 504 112 452 198 468 S300 392 376 418 S494 350 568 376 S668 300 750 329 S860 270 924 282 S1032 201 1114 238 S1230 150 1292 177 S1380 122 1440 98" fill="none" stroke="#75b7ff" strokeWidth="2" />
        <g fill="#75b7ff">
          <circle cx="198" cy="468" r="3" />
          <circle cx="568" cy="376" r="3" />
          <circle cx="924" cy="282" r="3" />
          <circle cx="1292" cy="177" r="3" />
        </g>
      </svg>

      {!prefersReducedMotion && !videoFailed && (
        <Suspense fallback={null}>
          <HtmlPlayer
            className="hero-background-player absolute inset-0 opacity-55"
            src={VIDEO_PATH}
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0 }}
            onError={() => setVideoFailed(true)}
          />
        </Suspense>
      )}

      <div className="absolute inset-0 bg-[#080b0d]/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#101416]/85 via-[#101416]/55 to-[#101416]/30" />
    </div>
  )
}