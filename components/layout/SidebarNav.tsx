'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Search, BookOpen } from 'lucide-react';
import { topics } from '@/lib/curriculum';

type SidebarNavProps = {
  mobile?: boolean;
};

export function SidebarNav({ mobile = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredTopics = topics.map((topic) => {
    const matchingSubtopics = topic.subtopics.filter((subtopic) =>
      subtopic.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      topic.title.toLowerCase().includes(filterQuery.toLowerCase())
    );
    return {
      ...topic,
      subtopics: matchingSubtopics,
      hasMatch: matchingSubtopics.length > 0
    };
  }).filter((topic) => topic.hasMatch);

  return (
    <nav
      aria-label="PostgreSQL curriculum"
      className={
        mobile
          ? 'space-y-3'
          : 'sidebar-scroll sticky top-[var(--header-height)] h-[calc(100vh-var(--header-height))] overflow-y-auto border-r border-[#e5e2d9] px-4 py-5 bg-[#fafaf7]'
      }
    >
      <Link
        className="focus-ring mb-4 flex items-center justify-between rounded-lg border border-[#e5e2d9] bg-[#fffdf8] px-3 py-2.5 text-sm font-bold text-[#1c1c1c] hover:border-[#ff6600] hover:text-[#ff6600] transition"
        href="/notes"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#ff6600]" />
          Curriculum Overview
        </span>
        <span className="rounded bg-orange-100 px-2 py-0.5 text-[11px] font-mono font-bold text-[#ff6600]">
          46 Notes
        </span>
      </Link>

      {/* Real-time search filter */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#666666]" />
        <input
          type="text"
          placeholder="Filter 46 subtopics..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full rounded-md border border-[#e5e2d9] bg-[#ffffff] py-1.5 pl-8 pr-3 text-xs text-[#1c1c1c] placeholder-[#888888] focus:border-[#ff6600] focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        {filteredTopics.map((topic) => {
          const isActiveTopic = pathname.includes(`/notes/${topic.id}`);
          const isSearching = filterQuery.length > 0;

          return (
            <details
              key={topic.id}
              className="group rounded-md"
              open={isActiveTopic || isSearching || topic.id === '00-foundations'}
            >
              <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-2 text-xs font-bold text-[#333333] hover:bg-[#f3f0e6] hover:text-[#ff6600] transition">
                <span className="truncate">{topic.title}</span>
                <ChevronDown
                  className="h-3.5 w-3.5 shrink-0 text-[#888888] transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-1 space-y-1 border-l border-[#e5e2d9] pl-3">
                {topic.subtopics.map((subtopic) => {
                  const href = `/notes/${topic.id}/${subtopic.slug}`;
                  const isActive = pathname === href || pathname === `${href}/`;

                  return (
                    <Link
                      key={subtopic.slug}
                      className={[
                        'focus-ring block rounded-md px-2.5 py-1.5 text-xs transition',
                        isActive
                          ? 'bg-orange-100/80 font-bold text-[#ff6600] border border-orange-200'
                          : 'text-[#555555] hover:bg-[#f3f0e6] hover:text-[#1c1c1c]'
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
