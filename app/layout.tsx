import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://gyomu.ai'),
  title: 'Smart Social | 日本語X運用のAI SNS管理ツール',
  description:
    'Smart Socialは、日本語でX投稿のAI生成、予約投稿、Auto-plug、Evergreen再活用をまとめて運用できるSNS管理ツールです。無料で先行利用を始められます。',
  alternates: {
    canonical: '/smart-social',
  },
  openGraph: {
    title: 'Smart Social | 日本語X運用のAI SNS管理ツール',
    description:
      '日本語でX投稿のAI生成、予約投稿、Auto-plug、Evergreen再活用をまとめて運用。',
    url: '/smart-social',
    siteName: 'Smart Social',
    locale: 'ja_JP',
    type: 'website',
    images: [
      {
        url: '/smart-social/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Smart Social',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smart Social | 日本語X運用のAI SNS管理ツール',
    description:
      '日本語でX投稿のAI生成、予約投稿、Auto-plug、Evergreen再活用をまとめて運用。',
    images: ['/smart-social/opengraph-image'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
