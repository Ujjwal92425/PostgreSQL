'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SidebarNav } from './SidebarNav';

export function Header() {
  return (
    <header className="sticky top-0 z-40 h-[var(--header-height)] border-b border-yc-border bg-yc-bg/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-8xl items-center justify-between gap-4 px-5 md:px-8">
        <Link className="focus-ring flex items-baseline gap-2 rounded-md" href="/">
          <span className="text-lg font-bold">PostgreSQL Notes</span>
        </Link>

        <details className="group md:hidden">
          <summary className="focus-ring flex h-10 w-10 list-none items-center justify-center rounded-md border border-yc-border bg-yc-bg-alt text-yc-text">
            <Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
            <X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />
            <span className="sr-only">Toggle menu</span>
          </summary>
          <div className="fixed inset-x-0 top-[var(--header-height)] max-h-[calc(100vh-var(--header-height))] overflow-y-auto border-b border-yc-border bg-yc-bg p-4 shadow-sm">
            <SidebarNav mobile />
          </div>
        </details>
      </div>
    </header>
  );
}
