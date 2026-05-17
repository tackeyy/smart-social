export type Plan = 'free' | 'pro' | 'business'

export type BillingInterval = 'monthly' | 'yearly'

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'past_due'
  | 'incomplete'

export type Feature =
  | 'style-profile'
  | 'auto-plug'
  | 'evergreen'
  | 'analytics-90d'
  | 'analytics-365d'
  | 'team-members'

export interface PlanLimits {
  aiGenerationsPerMonth: number
  xAccounts: number
  scheduledPostsPerMonth: number
  templates: number
  autoPlugRules: number
  evergreenRules: number
  teamMembers: number
  analyticsDays: number
}

export interface Subscription {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  plan: Plan
  status: SubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}
