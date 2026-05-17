'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  FileText,
  Gauge,
  Menu,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'

const navItems = [
  { href: '#features', label: '機能' },
  { href: '#pricing', label: '料金' },
  { href: '#faq', label: 'FAQ' },
]

const workflow = [
  {
    icon: WandSparkles,
    step: '01',
    title: '文体を学ぶAI生成',
    body: '過去投稿やプロフィールから、あなたらしい言い回しのドラフトを作ります。',
  },
  {
    icon: ShieldCheck,
    step: '02',
    title: 'Precheckで確認',
    body: '外部リンク、表現、投稿形式を公開前に確認し、手戻りを減らします。',
  },
  {
    icon: CalendarClock,
    step: '03',
    title: '予約投稿と初動設計',
    body: '予定をカレンダーで管理し、見られやすい時間帯に合わせて配信します。',
  },
  {
    icon: RefreshCw,
    step: '04',
    title: '伸びた投稿を再活用',
    body: 'Auto-plugとEvergreenで、良い反応を次の導線と投稿資産につなげます。',
  },
]

const plans = [
  {
    name: 'Free',
    price: '¥0',
    note: 'まず操作感を確認',
    cta: '無料で試す',
    href: '/auth/login',
    highlightedCta: false,
    specs: {
      account: '1件',
      ai: '月10件',
      automation: '予約 月5件',
      team: '個人利用',
    },
  },
  {
    name: 'Pro',
    price: '¥4,980',
    note: '個人・小規模チームの本命',
    cta: 'Proで始める',
    href: '/auth/login',
    highlightedCta: true,
    featured: true,
    specs: {
      account: '3件',
      ai: '月100件',
      automation: 'Auto-plug / Evergreen 各3ルール',
      team: '文体プロファイル',
    },
  },
  {
    name: 'Business',
    price: '¥12,800',
    note: '複数アカウント運用向け',
    cta: '導入相談をする',
    href: 'mailto:contact@gyomu.ai?subject=Smart%20Social%E3%81%AE%E5%B0%8E%E5%85%A5%E7%9B%B8%E8%AB%87',
    highlightedCta: false,
    specs: {
      account: '10件',
      ai: '無制限',
      automation: '詳細分析 365日',
      team: '最大5名',
    },
  },
]

const comparisonRows = [
  ['日本語UI', 'Smart Social / SocialDog'],
  ['X特化の投稿生成', 'Smart Social / Tweet Hunter'],
  ['文体プロファイル', 'Smart Social'],
  ['Auto-plug / Evergreen', 'Smart Social / Tweet Hunter'],
  ['チーム承認ワークフロー', 'Smart Social'],
]

const faqs = [
  {
    question: 'SocialDogやBufferとの違いは何ですか？',
    answer:
      'Smart SocialはX運用に絞り、日本語の投稿生成、文体プロファイル、Auto-plug、Evergreen再活用を一つの流れで扱う設計です。フォロワー管理よりも「投稿を作り、伸ばし、再利用する」業務を重視しています。',
  },
  {
    question: '士業以外でも使えますか？',
    answer:
      '使えます。初期の訴求は汎用X運用ツールです。士業向けテンプレートやカレンダーは、必要なユーザー向けの追加価値として拡張していきます。',
  },
  {
    question: 'チーム運用や承認フローに対応していますか？',
    answer:
      'チーム管理、ロール管理、承認ワークフローの土台を実装しています。複数人でドラフトを確認してから投稿する運用に対応していく設計です。',
  },
  {
    question: '外部リンク付き投稿の扱いも確認できますか？',
    answer:
      'Precheckで外部リンクや投稿形式を確認し、Xで読まれやすいコンテンツファーストの投稿設計を支援します。',
  },
]

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <main className="min-h-screen bg-white text-[#1f2437]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Smart Social',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              '日本語でXの投稿生成、予約投稿、Auto-plug、Evergreen再活用をまとめて運用できるAI SNS管理ツール。',
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: '0',
              highPrice: '12800',
              priceCurrency: 'JPY',
            },
          }),
        }}
      />

      <header className="absolute left-0 right-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            aria-label="Smart Social トップ"
            className="flex items-center"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Image
              src="/smart-social/brand/smart-social-logo.svg"
              alt="Smart Social"
              width={320}
              height={60}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/78 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:block">
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-[6px] bg-white px-4 text-sm font-semibold text-[#24324d] shadow-sm transition hover:bg-[#edf6ff]"
            >
              ログイン
            </Link>
          </div>
          <button
            type="button"
            aria-controls="mobile-lp-nav"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[6px] border border-white/18 bg-white/10 text-white backdrop-blur transition hover:bg-white/16 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <div
          id="mobile-lp-nav"
          hidden={!mobileMenuOpen}
          className={`mx-5 overflow-hidden rounded-[8px] border border-white/14 bg-[#111827]/94 shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur transition-all duration-200 md:hidden ${
            mobileMenuOpen
              ? 'max-h-80 translate-y-0 opacity-100'
              : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'
          }`}
        >
          <nav className="grid p-2 text-sm font-semibold text-white">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center justify-between rounded-[6px] px-3 transition hover:bg-white/10"
              >
                {item.label}
                <ChevronRight className="h-4 w-4 text-white/50" />
              </a>
            ))}
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 flex min-h-11 items-center justify-center rounded-[6px] bg-white px-3 text-[#24324d]"
            >
              ログイン
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#0c1424] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,#0b1120_0%,#17213b_58%,#0f172a_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-24 sm:px-8 sm:pb-24 sm:pt-28 lg:min-h-screen lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-12 lg:pb-28 lg:pt-32">
          <div className="max-w-xl animate-hero-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-[6px] border border-white/18 bg-white/8 px-3 py-1.5 text-sm font-medium text-[#bde0ff]">
              <Sparkles className="h-4 w-4" />
              日本語X運用のためのAIワークスペース
            </p>
            <h1 className="text-[42px] font-semibold leading-[1.16] tracking-normal sm:text-[56px] lg:text-[64px]">
              Smart Social
            </h1>
            <p className="mt-5 text-3xl font-semibold leading-[1.35] tracking-normal text-white sm:text-4xl">
              X投稿を、作って伸ばして再利用。
            </p>
            <p className="mt-5 max-w-lg text-base leading-8 text-white/74 sm:text-lg">
              Claude品質の日本語生成、文体プロファイル、予約投稿、Auto-plug、Evergreenを一つに。毎日のX運用を、チームで回せる仕組みに変えます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[6px] bg-[#0284fe] px-6 text-base font-semibold text-white shadow-[0_12px_32px_rgba(2,132,254,0.32)] transition hover:bg-[#0272dc]"
              >
                先行利用を始める
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[6px] border border-white/20 px-6 text-base font-semibold text-white transition hover:bg-white/10"
              >
                運用フローを見る
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-5 text-sm leading-6 text-white/52 sm:hidden">
              Proは月額¥4,980。AI生成100件/月から始められます。
            </p>
            <dl className="mt-9 hidden grid-cols-3 gap-5 border-t border-white/12 pt-6 text-sm sm:grid">
              <div>
                <dt className="text-white/48">AI生成</dt>
                <dd className="mt-1 text-xl font-semibold">100件/月</dd>
              </div>
              <div>
                <dt className="text-white/48">Pro</dt>
                <dd className="mt-1 text-xl font-semibold">¥4,980</dd>
              </div>
              <div>
                <dt className="text-white/48">X連携</dt>
                <dd className="mt-1 text-xl font-semibold">3件</dd>
              </div>
            </dl>
          </div>

          <div className="relative animate-hero-float lg:justify-self-end">
            <div className="relative overflow-hidden rounded-[12px] border border-white/14 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between border-b border-[#e5e7ef] bg-[#f6f8fb] px-4 py-3 sm:px-5 sm:py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                </div>
                <p className="text-xs font-semibold text-[#5e6993]">Drafts / Schedule</p>
              </div>
              <div className="grid bg-[#f3f6f9] text-[#333851] md:grid-cols-[168px_1fr]">
                <aside className="hidden border-r border-[#dcdfe8] bg-[#111827] p-4 text-white md:block">
                  <p className="text-xs font-semibold uppercase text-white/38">Workspace</p>
                  {['Drafts', 'Schedule', 'Precheck', 'Evergreen'].map((item, index) => (
                    <div
                      key={item}
                      className={`mt-3 rounded-[6px] px-3 py-2 text-sm ${
                        index === 0 ? 'bg-white/12 text-white' : 'text-white/55'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </aside>
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 border-b border-[#dcdfe8] pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#5e6993]">AI Draft</p>
                      <h2 className="mt-1 text-xl font-semibold text-[#252b43]">
                        今週のX投稿候補
                      </h2>
                    </div>
                    <span className="w-fit rounded-[6px] bg-[#d3f2eb] px-3 py-1 text-xs font-semibold text-[#208770]">
                      Precheck OK
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
                    <article className="rounded-[8px] border border-[#dcdfe8] bg-white p-4 shadow-[0_10px_28px_rgba(18,42,66,0.07)]">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-[5px] bg-[#ebf5ff] px-2 py-1 text-xs font-semibold text-[#0284fe]">
                          税務カレンダー
                        </span>
                        <span className="text-xs text-[#9298b6]">予約候補</span>
                      </div>
                      <p className="text-sm leading-7 text-[#333851]">
                        6月の資金繰りで見落としやすい3つの期限を、実務目線で整理しました。
                      </p>
                      <div className="mt-4 grid gap-2 text-xs text-[#5e6993] sm:grid-cols-2">
                        <span className="rounded-[5px] bg-[#f6f8fb] px-2 py-2">
                          外部リンクなし
                        </span>
                        <span className="rounded-[5px] bg-[#f6f8fb] px-2 py-2">
                          文字数 126 / 280
                        </span>
                      </div>
                    </article>

                    <div className="rounded-[8px] border border-[#dcdfe8] bg-white p-4">
                      <p className="text-xs font-semibold uppercase text-[#5e6993]">
                        Next schedule
                      </p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums text-[#252b43]">
                        06/18
                      </p>
                      <p className="mt-1 text-sm text-[#5e6993]">木 08:45 公開</p>
                      <div className="mt-4 space-y-2">
                        {['Precheck', 'Thread', 'Evergreen'].map((item) => (
                          <div
                            key={item}
                            className="flex items-center justify-between rounded-[5px] bg-[#f6f8fb] px-3 py-2 text-xs"
                          >
                            <span>{item}</span>
                            <Check className="h-4 w-4 text-[#208770]" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      ['承認率', '64%'],
                      ['予約済み', '18'],
                      ['再利用', '7'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[6px] bg-white px-2 py-3 text-center">
                        <p className="text-xs text-[#5e6993]">{label}</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-[#252b43] sm:text-2xl">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#0284fe]">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
              生成だけで終わらない。投稿運用を一本の流れに。
            </h2>
            <p className="mt-5 text-base leading-8 text-[#5e6993]">
              ネタ出し、文章化、チェック、予約、伸びた投稿の追い投稿、過去投稿の再利用までを同じワークスペースで扱います。
            </p>
          </div>
          <div className="mt-12 grid gap-0 overflow-hidden rounded-[8px] border border-[#dcdfe8] bg-white md:grid-cols-4">
            {workflow.map(({ icon: Icon, step, title, body }) => (
              <div
                key={title}
                className="group relative border-b border-[#dcdfe8] p-6 transition hover:bg-[#ebf5ff] md:border-b-0 md:border-r md:last:border-r-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#0284fe]">{step}</span>
                  <Icon className="h-5 w-5 text-[#9298b6] transition group-hover:text-[#0284fe]" />
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-[1.55] text-[#252b43]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#5e6993]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8fb] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[#0284fe]">Differentiation</p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
              汎用SNS管理でも、英語圏Xツールでもない。
            </h2>
            <p className="mt-5 text-base leading-8 text-[#5e6993]">
              Smart Socialは「日本語UI × 高品質AI生成 × X特化運用」に集中。投稿前後の手作業を、少ない画面遷移でつなぎます。
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {[
                [Gauge, '使用量とプラン制限を可視化'],
                [Users, 'チーム・ロール管理に対応'],
                [MessageSquareText, '投稿生成から追い投稿まで管理'],
              ].map(([Icon, text]) => (
                <div key={text as string} className="border-t border-[#dcdfe8] pt-4">
                  <Icon className="h-5 w-5 text-[#0284fe]" />
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#252b43]">
                    {text as string}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-[8px] border border-[#dcdfe8] bg-white">
            {comparisonRows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[0.86fr_1.14fr] border-b border-[#edf0f5] px-4 py-4 last:border-b-0 sm:px-5"
              >
                <p className="text-sm font-semibold text-[#252b43]">{label}</p>
                <p className="text-sm leading-6 text-[#5e6993]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#0284fe]">Pricing</p>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
                小さく始めて、運用量に合わせて拡張。
              </h2>
            </div>
            <p className="text-sm leading-7 text-[#5e6993]">表示価格は税抜・月額です。</p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`flex rounded-[8px] border p-6 ${
                  plan.featured
                    ? 'border-[#0284fe] bg-[#f8fbff] shadow-[0_14px_40px_rgba(2,132,254,0.12)]'
                    : 'border-[#dcdfe8] bg-white'
                }`}
              >
                <div className="flex w-full flex-col">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-semibold text-[#252b43]">{plan.name}</h3>
                    {plan.featured && (
                      <span className="rounded-[5px] bg-[#0284fe] px-2 py-1 text-xs font-semibold text-white">
                        推奨
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-4xl font-semibold tracking-normal text-[#252b43]">
                    {plan.price}
                    <span className="text-base font-medium text-[#5e6993]">/月</span>
                  </p>
                  <p className="mt-2 text-sm text-[#5e6993]">{plan.note}</p>
                  <dl className="mt-6 space-y-3 border-t border-[#dcdfe8] pt-5">
                    {[
                      ['アカウント', plan.specs.account],
                      ['AI生成', plan.specs.ai],
                      ['自動化', plan.specs.automation],
                      ['チーム', plan.specs.team],
                    ].map(([label, value]) => (
                      <div key={label} className="grid grid-cols-[86px_1fr] gap-3 text-sm">
                        <dt className="text-[#5e6993]">{label}</dt>
                        <dd className="font-medium leading-6 text-[#333851]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {plan.href.startsWith('mailto:') ? (
                    <a
                      href={plan.href}
                      className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-semibold transition ${
                        plan.highlightedCta
                          ? 'bg-[#0284fe] text-white hover:bg-[#0272dc]'
                          : 'border border-[#dcdfe8] bg-white text-[#252b43] hover:border-[#0284fe]'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <Link
                      href={plan.href}
                      className={`mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] px-4 text-sm font-semibold transition ${
                        plan.highlightedCta
                          ? 'bg-[#0284fe] text-white hover:bg-[#0272dc]'
                          : 'border border-[#dcdfe8] bg-white text-[#252b43] hover:border-[#0284fe]'
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-[#f6f8fb] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold text-[#0284fe]">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
            よくある質問
          </h2>
          <div className="mt-9 divide-y divide-[#dcdfe8] border-y border-[#dcdfe8]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-semibold leading-[1.55] text-[#252b43]">
                  {faq.question}
                  <FileText className="h-5 w-5 flex-none text-[#9298b6] transition group-open:text-[#0284fe]" />
                </summary>
                <p className="mt-4 max-w-3xl text-sm leading-8 text-[#5e6993]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
            まずは、今週の投稿づくりから。
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5e6993]">
            Smart Socialで、X投稿の生成・確認・予約・再活用をまとめて始められます。
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/auth/login"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[6px] bg-[#0284fe] px-6 text-base font-semibold text-white transition hover:bg-[#0272dc]"
            >
              先行利用を始める
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="mailto:contact@gyomu.ai?subject=Smart%20Social%E3%81%AE%E7%9B%B8%E8%AB%87"
              className="inline-flex min-h-[52px] items-center justify-center rounded-[6px] border border-[#dcdfe8] bg-white px-6 text-base font-semibold text-[#252b43] transition hover:border-[#0284fe]"
            >
              導入相談をする
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-[#dcdfe8] pt-6 text-sm text-[#5e6993] sm:flex-row">
          <p>© 2026 Smart Social</p>
          <p>AI-powered X operations for Japanese teams.</p>
        </div>
      </footer>

    </main>
  )
}
