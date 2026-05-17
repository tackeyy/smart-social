'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/dashboard/drafts', label: 'ドラフト' },
  { href: '/dashboard/timeline', label: 'タイムライン' },
  { href: '/dashboard/mentions', label: 'メンション' },
  { href: '/dashboard/schedule', label: 'スケジュール' },
  { href: '/dashboard/analytics', label: '分析' },
  { href: '/dashboard/accounts', label: 'アカウント' },
  { href: '/dashboard/usage', label: '使用量' },
  { href: '/dashboard/settings', label: '設定' },
]

interface NavBarProps {
  desktopRightSlot?: React.ReactNode
}

export function NavBar({ desktopRightSlot }: NavBarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  function isActive(href: string) {
    // /dashboard は完全一致、その他は前方一致
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-manavi-navy border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/dashboard"
              className="text-white font-semibold text-base tracking-[-0.01em] shrink-0"
            >
              Smart Social
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label }) => {
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
              onClick={() => setOpen((prev) => !prev)}
              className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-2">
          {navLinks.map(({ href, label }) => {
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
      )}
    </nav>
  )
}
