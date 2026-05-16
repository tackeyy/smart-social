const rateLimitMap = new Map<string, number>()

export interface RateLimitResult {
  allowed: boolean
  remainingSec: number
}

export function checkRateLimit(key: string, cooldownMs: number): RateLimitResult {
  const lastCall = rateLimitMap.get(key)
  const now = Date.now()

  if (lastCall !== undefined && now - lastCall < cooldownMs) {
    const remainingSec = Math.ceil((cooldownMs - (now - lastCall)) / 1000)
    return { allowed: false, remainingSec }
  }

  rateLimitMap.set(key, now)
  return { allowed: true, remainingSec: 0 }
}

export function clearRateLimitCache(): void {
  rateLimitMap.clear()
}
