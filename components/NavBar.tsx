'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X } from 'lucide-react'

const primaryNavLinks = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/dashboard/drafts', label: 'ドラフト' },
  { href: '/dashboard/timeline', label: 'タイムライン' },
  { href: '/dashboard/schedule', label: 'スケジュール' },
  { href: '/dashboard/analytics', label: '分析' },
]

const secondaryNavLinks = [
  { href: '/dashboard/mentions', label: 'メンション' },
  { href: '/dashboard/accounts', label: 'アカウント' },
  { href: '/dashboard/usage', label: '使用量' },
  { href: '/dashboard/billing', label: 'プラン' },
  { href: '/dashboard/settings', label: '設定' },
]

interface NavBarProps {
  desktopRightSlot?: React.ReactNode
  mobileContextSlot?: React.ReactNode
}

export function NavBar({ desktopRightSlot, mobileContextSlot }: NavBarProps) {
  const [open, setOpen] = useState(false)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    // /dashboard は完全一致、その他は前方一致
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const secondaryActive = secondaryNavLinks.some(({ href }) => isActive(href))

  return (
    <nav className="bg-manavi-navy border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="text-white font-semibold text-base tracking-[-0.01em] shrink-0"
            >
              Smart Social
            </Link>
            <div className="hidden md:flex items-center gap-1 min-w-0">
              {primaryNavLinks.map(({ href, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`text-sm px-3 py-1.5 rounded transition-colors duration-150 ${
                      active
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                )
              })}
              <div className="relative">
                <button
                  type="button"
                  aria-label="その他のナビゲーション"
                  aria-expanded={secondaryOpen}
                  aria-controls="dashboard-secondary-nav"
                  onClick={() => setSecondaryOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded transition-colors duration-150 ${
                    secondaryActive || secondaryOpen
                      ? 'text-white bg-white/10'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  その他
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      secondaryOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {secondaryOpen && (
                  <div
                    id="dashboard-secondary-nav"
                    className="absolute left-0 top-full z-50 mt-2 w-44 rounded-md border border-white/10 bg-manavi-navy p-1 shadow-lg shadow-black/20"
                  >
                    {secondaryNavLinks.map(({ href, label }) => {
                      const active = isActive(href)
                      return (
                        <Link
                          key={href}
                          href={href}
                          aria-current={active ? 'page' : undefined}
                          className={`block rounded px-3 py-2 text-sm transition-colors duration-150 ${
                            active
                              ? 'bg-white/10 text-white'
                              : 'text-white/65 hover:bg-white/5 hover:text-white'
                          }`}
                          onClick={() => setSecondaryOpen(false)}
                        >
                          {label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {desktopRightSlot && (
              <div className="hidden md:flex items-center gap-3">{desktopRightSlot}</div>
            )}
            <button
              type="button"
              aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
              aria-expanded={open}
              aria-controls="dashboard-mobile-menu"
              onClick={() => setOpen((prev) => !prev)}
              className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          id="dashboard-mobile-menu"
          className="md:hidden border-t border-white/10 px-4 py-3"
        >
          {mobileContextSlot && (
            <div className="mb-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {mobileContextSlot}
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/35">
                主要
              </p>
              {primaryNavLinks.map(({ href, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`block text-sm px-2 py-2.5 rounded transition-colors duration-150 ${
                      active
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
            <div>
              <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/35">
                管理
              </p>
              {secondaryNavLinks.map(({ href, label }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`block text-sm px-2 py-2.5 rounded transition-colors duration-150 ${
                      active
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
