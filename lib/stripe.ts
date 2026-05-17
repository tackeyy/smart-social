import Stripe from 'stripe'

let _stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (_stripeInstance) return _stripeInstance
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  _stripeInstance = new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
  return _stripeInstance
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
