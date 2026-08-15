'use client';

import Link from 'next/link';
import { Menu, X, Database, Terminal } from 'lucide-react';
import { SidebarNav } from './SidebarNav';

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-[var(--header-height)] border-b border-[#e5e2d9] bg-[#fafaf7]/95 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-8xl items-center justify-between gap-4 px-5 md:px-8">
        <Link className="focus-ring flex items-center gap-2.5 rounded-md text-[#1c1c1c] hover:text-[#ff6600] transition" href="/">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-[#ff6600] border border-orange-500/20">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight">PostgreSQL Masterclass</span>
            <span className="ml-2 hidden rounded bg-orange-100 px-2 py-0.5 text-[10px] font-mono font-bold text-[#ff6600] border border-orange-200 sm:inline-block">
              PRO NOTES
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-4 text-xs font-mono text-[#666666] md:flex">
          <span className="flex items-center gap-1.5 text-[#137333] font-semibold">
            <Terminal className="h-3.5 w-3.5" /> 46 Complete Deep-Dive Notes
          </span>
          <span className="h-3 w-[1px] bg-[#e5e2d9]" />
          <Link href="/notes/00-foundations/database-mental-model" className="hover:text-[#ff6600] font-bold transition">
            Start Learning →
          </Link>
        </div>

        <details className="group md:hidden">
          <summary className="focus-ring flex h-9 w-9 list-none items-center justify-center rounded-md border border-[#e5e2d9] bg-[#f8f7f2] text-[#1c1c1c]">
            <Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
            <X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />
            <span className="sr-only">Toggle menu</span>
          </summary>
          <div className="fixed inset-x-0 top-[var(--header-height)] max-h-[calc(100vh-var(--header-height))] overflow-y-auto border-b border-[#e5e2d9] bg-[#fafaf7] p-4 shadow-xl">
            <SidebarNav mobile />
          </div>
        </details>
      </div>
    </header>
  );
}
