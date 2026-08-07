'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { topics } from '@/lib/curriculum';

type SidebarNavProps = {
  mobile?: boolean;
};

export function SidebarNav({ mobile = false }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="PostgreSQL curriculum" className={mobile ? 'space-y-2' : 'sidebar-scroll sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] overflow-y-auto border-r border-yc-border px-4 py-5'}>
      <Link
        className="focus-ring mb-4 block rounded-md border border-yc-border bg-yc-bg-alt px-3 py-2 text-sm font-bold hover:border-yc-accent"
        href="/notes"
      >
        Curriculum overview
      </Link>

      <div className="space-y-2">
        {topics.map((topic) => {
          const isActiveTopic = pathname.includes(`/notes/${topic.id}`);

          return (
            <details key={topic.id} className="group rounded-md" open={isActiveTopic || topic.id === '00-foundations'}>
              <summary className="focus-ring flex list-none items-center justify-between gap-3 rounded-md px-2 py-2 text-sm font-bold hover:bg-yc-bg-card">
                <span>{topic.title}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-yc-text-muted transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-1 space-y-1 border-l border-yc-border pl-3">
                {topic.subtopics.map((subtopic) => {
                  const href = `/notes/${topic.id}/${subtopic.slug}`;
                  const isActive = pathname === href || pathname === `${href}/`;

                  return (
                    <Link
                      key={subtopic.slug}
                      className={[
                        'focus-ring block rounded-md px-2 py-1.5 text-sm transition',
                        isActive
                          ? 'bg-yc-bg-card font-bold text-yc-accent'
                          : 'text-yc-text-muted hover:bg-yc-bg-card hover:text-yc-text'
                      ].join(' ')}
                      href={href}
                    >
                      {subtopic.title}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
