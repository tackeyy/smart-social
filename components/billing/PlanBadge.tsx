'use client'

import Link from 'next/link'
import type { Plan } from '@/types/subscription'

interface PlanBadgeProps {
  plan: Plan
}

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
}

const PLAN_STYLE: Record<Plan, string> = {
  free: 'bg-white/10 text-white/60',
  pro: 'bg-manavi-primary/80 text-white',
  business: 'bg-amber-500/80 text-white',
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  return (
    <Link
      href="/dashboard/billing"
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${PLAN_STYLE[plan]}`}
      aria-label={`現在のプラン: ${PLAN_LABEL[plan]}。クリックでプラン変更`}
    >
      {PLAN_LABEL[plan]}
    </Link>
  )
}
