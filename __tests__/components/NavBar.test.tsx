import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, ...props }, children),
}))

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
}))

import { NavBar } from '@/components/NavBar'

describe('NavBar', () => {
  it('"Smart Social" ロゴが表示される', () => {
    render(React.createElement(NavBar))
    expect(screen.getByText('Smart Social')).toBeTruthy()
  })

  it('全6ナビリンクが存在する', () => {
    render(React.createElement(NavBar))
    expect(screen.getAllByRole('link', { name: 'ダッシュボード' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'ドラフト' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'スケジュール' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: '分析' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'アカウント' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: '設定' }).length).toBeGreaterThan(0)
  })

  it('モバイルメニュー開閉ボタンが存在する', () => {
    render(React.createElement(NavBar))
    expect(screen.getByRole('button', { name: /メニュー/ })).toBeTruthy()
  })

  it('初期状態でモバイルメニューが閉じている', () => {
    render(React.createElement(NavBar))
    const button = screen.getByRole('button', { name: /メニュー/ })
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('ハンバーガーボタンをクリックするとメニューが開く', () => {
    render(React.createElement(NavBar))
    const button = screen.getByRole('button', { name: /メニュー/ })
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('開いた状態で再クリックするとメニューが閉じる', () => {
    render(React.createElement(NavBar))
    const button = screen.getByRole('button', { name: /メニュー/ })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })
})
