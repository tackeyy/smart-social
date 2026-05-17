# Smart Social UI/UX Review

Reviewed locally on 2026-05-17 with Playwright against `http://localhost:3000/smart-social`.

Artifacts:
- `output/playwright/lp-desktop.png`
- `output/playwright/lp-mobile.png`
- `output/playwright/login-desktop.png`
- `output/playwright/login-mobile.png`

Note: authenticated dashboard routes redirected to `/auth/login`. To avoid mutating the remote Supabase project, dashboard findings are based on source review plus the verified shared design system and unauthenticated surfaces.

## Findings

| ID | Severity | Area | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| UX-01 | High | LP mobile hero | The hero product mock starts below the CTA but visually crowds the CTA/stat area; the first viewport feels overpacked and the CTA is not given enough breathing room. | On mobile, separate hero copy and mock with stronger vertical rhythm, reduce mock height, or move the mock after the first viewport. |
| UX-02 | High | LP visual direction | The first viewport uses a gradient plus synthetic UI mock, but no real product screen or image-led anchor. This weakens Stripe-like product credibility. | Replace the decorative mock with an actual product screenshot/state or a more faithful app preview. |
| UX-03 | Medium | LP mobile | Header logo and login button occupy the entire top row while product navigation disappears; no mobile menu or section navigation exists. | Add a compact mobile menu or keep key anchors accessible behind an icon button. |
| UX-04 | Medium | LP content hierarchy | The LP repeats similar claims across Problem, Workflow, Features, Positioning, Trust, and CTA. Scanning is good, but conversion momentum is diluted. | Cut one middle section or merge Problem/Positioning. Keep one proof-focused comparison section. |
| UX-05 | Medium | LP pricing | Pricing cards look clean but lack a CTA, plan limit caveats, and feature hierarchy under each plan. | Add per-plan CTAs and group limits by AI, accounts, automation, team. |
| UX-06 | Medium | Login | Login screen is clean, but it is too sparse: no back link, no security/SSO reassurance, no explanation of magic link behavior before submission. | Add a low-emphasis back link and one short helper line below the email field. |
| UX-07 | Low | Login mobile | Legal copy is centered and small; links are not individually actionable in the current UI. | Make terms/privacy actual links and keep text readable at 12px+ with stronger contrast. |
| UX-08 | High | Dashboard nav | Desktop nav has 10 items in one horizontal row, which risks overflow and weak information architecture. Mobile hides account/plan/user context completely. | Group secondary items under Settings/More, keep AccountSelector/PlanBadge visible or reachable on mobile. |
| UX-09 | Medium | Dashboard system | Some pages use `text-xl`, others `text-2xl font-bold`; Card radius alternates between `rounded-lg`, `rounded-md`, and `rounded-[6px]`. | Normalize page header and card primitives to the Stripe/M&A token scale. |
| UX-10 | Medium | Draft actions | Draft card footer uses four text buttons in one row; on mobile this will wrap poorly and destructive/action hierarchy is unclear. | Use primary action right-aligned, secondary actions in a menu or stacked action bar on mobile. |
| UX-11 | Medium | Schedule | Schedule page mixes creation form and list in one vertical flow; the primary task is ambiguous. | Use tabs or a split layout: schedule list/calendar as primary, creation in a side panel/dialog. |
| UX-12 | Medium | Analytics | Analytics page stacks many KPI cards before the actionable table, creating dashboard-card density. | Prioritize the table/top insights; collapse follower stats or make them secondary. |
| UX-13 | Low | Tables on mobile | Schedule and analytics rely on horizontal scroll tables. This is workable but weak for repeated mobile use. | Use responsive row cards for mobile with key metrics first and overflow details collapsed. |
| UX-14 | Low | Accounts | Account management uses native `confirm`/`alert`, which breaks the otherwise polished Stripe-like interaction model. | Replace with the existing Dialog/Sonner components. |
| UX-15 | Low | Motion | LP only has hero entrance/float. Product UI interactions have minimal motion feedback. | Add restrained hover/press/loading transitions to cards, dialogs, and tab changes. |

