import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'frame-forge — 短剧 AI 生产平台',
  description: '多 Agent 协作的短剧全流程自动化生产平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">FF</span>
          </div>
          <span className="font-semibold text-slate-900 text-sm">frame-forge</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink href="/tasks">任务</NavLink>
          <NavLink href="/providers">供应商</NavLink>
          <NavLink href="/settings">设置</NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
    >
      {children}
    </a>
  );
}
