import type { Plan, PlanLimits, Feature } from '@/types/subscription'

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    aiGenerationsPerMonth: 10,
    xAccounts: 1,
    scheduledPostsPerMonth: 5,
    templates: 3,
    autoPlugRules: 0,
    evergreenRules: 0,
    teamMembers: 1,
    analyticsDays: 7,
  },
  pro: {
    aiGenerationsPerMonth: 100,
    xAccounts: 3,
    scheduledPostsPerMonth: Infinity,
    templates: Infinity,
    autoPlugRules: 3,
    evergreenRules: 3,
    teamMembers: 1,
    analyticsDays: 90,
  },
  business: {
    aiGenerationsPerMonth: Infinity,
    xAccounts: 10,
    scheduledPostsPerMonth: Infinity,
    templates: Infinity,
    autoPlugRules: Infinity,
    evergreenRules: Infinity,
    teamMembers: 5,
    analyticsDays: 365,
  },
}

const PLAN_FEATURES: Record<Plan, Set<Feature>> = {
  free: new Set([]),
  pro: new Set(['style-profile', 'auto-plug', 'evergreen', 'analytics-90d']),
  business: new Set([
    'style-profile',
    'auto-plug',
    'evergreen',
    'analytics-90d',
    'analytics-365d',
    'team-members',
  ]),
}

export function getPlanLimits(plan: Plan): PlanLimits {
  const limits = PLAN_LIMITS[plan]
  if (!limits) {
    throw new Error(`Unknown plan: ${plan}`)
  }
  return limits
}

export function canUseFeature(plan: Plan, feature: string): boolean {
  const features = PLAN_FEATURES[plan]
  if (!features) {
    return false
  }
  return features.has(feature as Feature)
}

export function getMonthlyAiLimit(plan: string): number {
  if (!(plan in PLAN_LIMITS)) {
    throw new Error(`Unknown plan: ${plan}`)
  }
  return PLAN_LIMITS[plan as Plan].aiGenerationsPerMonth
}
