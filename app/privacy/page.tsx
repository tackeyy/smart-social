import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | Smart Social',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-manavi-bg px-5 py-10 text-manavi-navy">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/auth/login"
          className="mb-6 inline-flex text-sm font-medium text-manavi-navy-light transition-colors hover:text-manavi-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-manavi-primary focus-visible:ring-offset-2"
        >
          ← ログインへ戻る
        </Link>

        <section className="rounded-[6px] border border-manavi-border bg-white px-6 py-7 shadow-manavi-sm sm:px-8 sm:py-8">
          <p className="text-sm font-medium text-manavi-primary">Smart Social</p>
          <h1 className="mt-2 text-2xl font-semibold text-manavi-navy">
            プライバシーポリシー
          </h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-manavi-navy-light">
            <p>
              本ページは、Smart Socialのプライバシーポリシーを掲載するための準備中ページです。
            </p>
            <p>
              正式な方針は、取り扱う情報の範囲や運用体制の確定にあわせて整備し、公開します。
              現時点では、詳細な個人情報の取扱条件を定めるものではありません。
            </p>
            <p>
              ご不明点がある場合は、サービス提供者までお問い合わせください。
            </p>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link
            href="/"
            className="font-medium text-manavi-navy underline-offset-4 transition-colors hover:text-manavi-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-manavi-primary focus-visible:ring-offset-2"
          >
            トップへ戻る
          </Link>
          <Link
            href="/terms"
            className="font-medium text-manavi-navy underline-offset-4 transition-colors hover:text-manavi-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-manavi-primary focus-visible:ring-offset-2"
          >
            利用規約
          </Link>
        </div>
      </div>
    </main>
  )
}
