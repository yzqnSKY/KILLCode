import type { Metadata } from 'next'
import { AppShell } from '@/components/shell/app-shell'
import 'katex/dist/katex.min.css'
import './globals.css'

export const metadata: Metadata = { title: 'KILLCode', description: '个人算法学习工具' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
    {/* Localhost browser extensions may add a host-derived class before React hydrates. */}
    <body suppressHydrationWarning><AppShell>{children}</AppShell></body>
  </html>
}
