/** Simulated network latency so loading states are visible in mock mode. */
export function mockDelay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(value)), ms)
  })
}

