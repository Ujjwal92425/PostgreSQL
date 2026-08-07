import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SchemaMap } from '@/components/diagrams/SchemaMap';
import { topics } from '@/lib/curriculum';

export default function NotesIndexPage() {
  return (
    <AppShell>
      <div className="content-frame">
        <article className="note-article">
          <div className="mb-8 border-b border-yc-border pb-8">
            <p className="mb-3 text-xs font-bold uppercase text-yc-accent">Curriculum</p>
            <h1>PostgreSQL from first principles to operating it for real.</h1>
            <p className="mt-5 max-w-2xl text-lg text-yc-text-secondary">
              The notes are organized as small pages. Each page keeps the same flow: definition,
              use, schema, query, internals, mistakes, production guidance, and practice.
            </p>
          </div>

          <section aria-labelledby="schema-title">
            <h2 id="schema-title">Shared production schema</h2>
            <p>
              The project uses one large mixed schema so every topic has practical examples: checkout,
              seat booking, financial decimals, analytics, auditing, search, security, and scaling.
            </p>
            <SchemaMap />
          </section>

          <section aria-labelledby="topics-title">
            <h2 id="topics-title">All topics</h2>
            <div className="grid gap-3">
              {topics.map((topic) => (
                <article key={topic.id} className="rounded-lg border border-yc-border bg-yc-bg-alt p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="m-0 text-lg font-bold">{topic.title}</h3>
                      <p className="mb-0 mt-1 text-sm text-yc-text-secondary">{topic.summary}</p>
                    </div>
                    <Link
                      className="focus-ring inline-flex items-center gap-2 rounded-md border border-yc-border px-3 py-1.5 text-sm font-bold hover:border-yc-accent"
                      href={`/notes/${topic.id}/${topic.subtopics[0].slug}`}
                    >
                      Open
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </article>
      </div>
    </AppShell>
  );
}
