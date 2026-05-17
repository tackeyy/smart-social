import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronRight,
  FileText,
  Gauge,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
} from 'lucide-react'

const features = [
  {
    icon: WandSparkles,
    title: '文体を学ぶAI生成',
    body: '過去投稿やプロフィールから、あなたらしい言い回しのドラフトを作成します。',
  },
  {
    icon: CalendarClock,
    title: '予約投稿と初動設計',
    body: '投稿予定をカレンダーで管理し、見られやすい時間帯に合わせて配信できます。',
  },
  {
    icon: RefreshCw,
    title: 'Evergreen再活用',
    body: '反応の良い投稿を再利用し、継続的にアカウントの露出を作ります。',
  },
  {
    icon: MessageSquareText,
    title: 'Auto-plug',
    body: '伸びた投稿に追い投稿を差し込み、プロフィールやサービス導線につなげます。',
  },
]

const workflow = [
  'ネタをテンプレートから選ぶ',
  'AIが投稿・スレッドを生成',
  'Precheckで外部リンクや表現を確認',
  '予約・再利用ルールまで設定',
]

const plans = [
  {
    name: 'Free',
    price: '¥0',
    note: 'まず操作感を確認',
    items: ['Xアカウント1件', 'AI生成 月10件', '予約投稿 月5件', '基本分析 7日'],
  },
  {
    name: 'Pro',
    price: '¥4,980',
    note: '個人・小規模チームの本命',
    items: ['Xアカウント3件', 'AI生成 月100件', '文体プロファイル', 'Auto-plug / Evergreen 各3ルール'],
    featured: true,
  },
  {
    name: 'Business',
    price: '¥12,800',
    note: '複数アカウント運用向け',
    items: ['Xアカウント10件', 'AI生成 無制限', '最大5名のチーム', '詳細分析 365日'],
  },
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

      <header className="absolute left-0 right-0 top-0 z-20">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Smart Social トップ" className="flex items-center">
            <Image
              src="/smart-social/brand/smart-social-logo.png"
              alt="Smart Social"
              width={160}
              height={30}
              priority
              className="h-8 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/78 md:flex">
            <a href="#features" className="transition hover:text-white">
              機能
            </a>
            <a href="#pricing" className="transition hover:text-white">
              料金
            </a>
            <a href="#faq" className="transition hover:text-white">
              FAQ
            </a>
          </nav>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-[6px] bg-white px-4 text-sm font-semibold text-[#24324d] shadow-sm transition hover:bg-[#edf6ff]"
          >
            ログイン
          </Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#111827] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_18%,rgba(2,132,254,0.24),transparent_34%),linear-gradient(120deg,#0b1120_0%,#17213b_54%,#0f172a_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent" />

        <div className="relative mx-auto grid min-h-[calc(100svh-0px)] max-w-7xl items-center gap-10 px-5 pb-16 pt-24 sm:px-8 sm:pb-20 sm:pt-28 lg:grid-cols-[0.9fr_1.1fr] lg:pb-28 lg:pt-32">
          <div className="max-w-xl animate-hero-rise">
            <p className="mb-5 inline-flex items-center gap-2 rounded-[6px] border border-white/18 bg-white/8 px-3 py-1.5 text-sm font-medium text-[#bde0ff]">
              <Sparkles className="h-4 w-4" />
              日本語X運用のためのAIワークスペース
            </p>
            <h1 className="text-[42px] font-semibold leading-[1.25] tracking-normal sm:text-[56px] lg:text-[64px]">
              Smart Social
            </h1>
            <p className="mt-5 text-3xl font-semibold leading-[1.4] tracking-normal text-white sm:text-4xl">
              X投稿を、作って伸ばして再利用。
            </p>
            <p className="mt-6 max-w-lg text-base leading-8 text-white/74 sm:text-lg">
              Claude品質の日本語生成、文体プロファイル、予約投稿、Auto-plug、Evergreenを一つに。毎日のX運用を、属人的な手作業からチームで回せる仕組みに変えます。
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auth/login"
                className="inline-flex h-13 min-h-13 items-center justify-center gap-2 rounded-[6px] bg-[#0284fe] px-6 text-base font-semibold text-white shadow-[0_12px_40px_rgba(2,132,254,0.35)] transition hover:bg-[#0272dc]"
              >
                先行利用を始める
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex h-13 min-h-13 items-center justify-center gap-2 rounded-[6px] border border-white/20 px-6 text-base font-semibold text-white transition hover:bg-white/10"
              >
                運用フローを見る
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
            <dl className="mt-9 grid grid-cols-3 gap-5 border-t border-white/12 pt-6 text-sm">
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
            <div className="absolute -inset-5 rounded-[24px] bg-[#0284fe]/18 blur-3xl" />
            <div className="relative overflow-hidden rounded-[18px] border border-white/14 bg-white shadow-2xl shadow-black/30">
              <div className="flex items-center justify-between border-b border-[#e5e7ef] bg-[#f6f8fb] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff6b6b]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffd166]" />
                  <span className="h-3 w-3 rounded-full bg-[#06d6a0]" />
                </div>
                <p className="text-xs font-semibold text-[#5e6993]">Content command center</p>
              </div>
              <div className="grid min-h-[520px] grid-cols-1 bg-[#f3f6f9] text-[#333851] md:grid-cols-[180px_1fr]">
                <aside className="hidden border-r border-[#dcdfe8] bg-[#111827] p-5 text-white md:block">
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
                <div className="p-5 sm:p-7">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[#5e6993]">AI Draft</p>
                      <h2 className="mt-1 text-xl font-semibold text-[#252b43]">
                        今週のX投稿候補
                      </h2>
                    </div>
                    <span className="rounded-[6px] bg-[#d3f2eb] px-3 py-1 text-xs font-semibold text-[#208770]">
                      Precheck OK
                    </span>
                  </div>

                  <div className="space-y-4">
                    {[
                      ['税務カレンダー', '6月の資金繰りで見落としやすい3つの期限を、実務目線で整理しました。'],
                      ['Xアルゴリズム', '外部リンクを先に置くより、本文で価値を出してから導線を置く方が読まれやすい。'],
                      ['Evergreen', '反応が良かった投稿を月次で磨き直し、次の予約枠に入れる。'],
                    ].map(([label, text], index) => (
                      <article
                        key={label}
                        className="rounded-[10px] border border-[#dcdfe8] bg-white p-4 shadow-[0_10px_28px_rgba(18,42,66,0.07)] transition duration-300 hover:-translate-y-1 hover:border-[#0284fe]/50"
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="rounded-[5px] bg-[#ebf5ff] px-2 py-1 text-xs font-semibold text-[#0284fe]">
                            {label}
                          </span>
                          <span className="text-xs text-[#9298b6]">予約候補</span>
                        </div>
                        <p className="text-sm leading-7 text-[#333851]">{text}</p>
                      </article>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      ['承認率', '64%'],
                      ['予約済み', '18'],
                      ['再利用', '7'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-[8px] bg-white px-3 py-3 text-center">
                        <p className="text-xs text-[#5e6993]">{label}</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums text-[#252b43]">
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

      <section className="bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-[#0284fe]">Problem</p>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
                X運用は、投稿する前後の仕事が多すぎる。
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#5e6993] sm:text-lg">
              ネタ出し、文章化、チェック、予約、伸びた投稿の追い投稿、過去投稿の再利用。どれか一つのツールではなく、運用全体をつなぐ場所が必要です。
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              ['投稿が続かない', '毎日ゼロから考えるため、繁忙期に投稿が止まります。'],
              ['AI文が浮く', '汎用AIの出力を直す時間がかかり、結局手作業に戻ります。'],
              ['伸びた後が弱い', '反応が良い投稿を見つけても、次の導線や再活用に移せません。'],
            ].map(([title, body]) => (
              <div key={title} className="border-t border-[#dcdfe8] pt-5">
                <h3 className="text-xl font-semibold leading-[1.5] text-[#252b43]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5e6993]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#f6f8fb] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#0284fe]">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
              生成だけで終わらない。投稿運用を一本の流れに。
            </h2>
          </div>
          <div className="mt-12 grid gap-0 overflow-hidden rounded-[12px] border border-[#dcdfe8] bg-white md:grid-cols-4">
            {workflow.map((item, index) => (
              <div
                key={item}
                className="group relative border-b border-[#dcdfe8] p-6 transition hover:bg-[#ebf5ff] md:border-b-0 md:border-r md:last:border-r-0"
              >
                <span className="text-sm font-semibold text-[#0284fe]">0{index + 1}</span>
                <h3 className="mt-4 min-h-14 text-lg font-semibold leading-[1.55] text-[#252b43]">
                  {item}
                </h3>
                <ChevronRight className="mt-6 h-5 w-5 text-[#9298b6] transition group-hover:translate-x-1 group-hover:text-[#0284fe]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <p className="text-sm font-semibold text-[#0284fe]">Features</p>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
                日本語でXを伸ばすための機能に集中。
              </h2>
              <p className="mt-5 text-base leading-8 text-[#5e6993]">
                海外のX特化ツールは強力ですが、UIも生成文も英語圏が中心。Smart Socialは日本語の運用現場に合わせて設計しています。
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, body }) => (
                <div key={title} className="border-l border-[#dcdfe8] pl-5">
                  <Icon className="h-6 w-6 text-[#0284fe]" />
                  <h3 className="mt-4 text-xl font-semibold leading-[1.5] text-[#252b43]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#5e6993]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f6f8fb] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-[#0284fe]">Positioning</p>
              <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal text-[#252b43] sm:text-4xl">
                汎用SNS管理でも、英語圏Xツールでもない。
              </h2>
              <p className="mt-5 text-base leading-8 text-[#5e6993]">
                SocialDogは日本語UIと管理機能に強く、Tweet HunterはX特化とAIに強い。Smart Socialはその間にある「日本語UI × 高品質AI生成 × X特化運用」を狙います。
              </p>
            </div>
            <div className="overflow-hidden rounded-[12px] border border-[#dcdfe8] bg-white">
              {[
                ['日本語UI', 'Smart Social / SocialDog'],
                ['X特化の投稿生成', 'Smart Social / Tweet Hunter'],
                ['文体プロファイル', 'Smart Social'],
                ['Auto-plug / Evergreen', 'Smart Social / Tweet Hunter'],
                ['チーム承認ワークフロー', 'Smart Social'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[0.9fr_1.1fr] border-b border-[#edf0f5] px-5 py-4 last:border-b-0"
                >
                  <p className="text-sm font-semibold text-[#252b43]">{label}</p>
                  <p className="text-sm leading-6 text-[#5e6993]">{value}</p>
                </div>
              ))}
            </div>
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
                className={`rounded-[12px] border p-6 ${
                  plan.featured
                    ? 'border-[#0284fe] bg-[#f8fbff] shadow-[0_18px_48px_rgba(2,132,254,0.14)]'
                    : 'border-[#dcdfe8] bg-white'
                }`}
              >
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
                <ul className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-[#333851]">
                      <Check className="mt-0.5 h-5 w-5 flex-none text-[#208770]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#111827] px-5 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-[#8bc8ff]">Trust</p>
            <h2 className="mt-3 text-3xl font-semibold leading-[1.45] tracking-normal sm:text-4xl">
              実務利用を前提に、制限と安全性を見える化。
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              [ShieldCheck, '認証情報はサーバー側で管理'],
              [Gauge, '使用量とプラン制限を可視化'],
              [Users, 'チーム・ロール管理に対応'],
            ].map(([Icon, text]) => (
              <div key={text as string} className="border-t border-white/16 pt-5">
                <Icon className="h-6 w-6 text-[#8bc8ff]" />
                <p className="mt-4 text-base font-semibold leading-7">{text as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="bg-white px-5 py-16 sm:px-8 sm:py-24">
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

      <section className="bg-[#f6f8fb] px-5 py-16 sm:px-8 sm:py-24">
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
              className="inline-flex h-13 min-h-13 items-center justify-center gap-2 rounded-[6px] bg-[#0284fe] px-6 text-base font-semibold text-white transition hover:bg-[#0272dc]"
            >
              先行利用を始める
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="mailto:contact@gyomu.ai?subject=Smart%20Social%E3%81%AE%E7%9B%B8%E8%AB%87"
              className="inline-flex h-13 min-h-13 items-center justify-center rounded-[6px] border border-[#dcdfe8] bg-white px-6 text-base font-semibold text-[#252b43] transition hover:border-[#0284fe]"
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dcdfe8] bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(18,42,66,0.08)] backdrop-blur md:hidden">
        <Link
          href="/auth/login"
          className="flex h-12 items-center justify-center gap-2 rounded-[6px] bg-[#0284fe] text-sm font-semibold text-white"
        >
          先行利用を始める
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  )
}
