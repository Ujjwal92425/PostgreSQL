import Link from 'next/link';
import { ArrowRight, BookOpen, Database, LockKeyhole, Route } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { topics } from '@/lib/curriculum';

const highlights = [
  {
    title: 'One schema across the journey',
    body: 'Identity, catalog, orders, payments, seat booking, audit logs, analytics, and outbox events all connect into one production-style model.',
    icon: Database
  },
  {
    title: 'Beginner to deep production',
    body: 'Each note starts in plain English, then moves into internals, query behavior, production mistakes, and interview framing.',
    icon: BookOpen
  },
  {
    title: 'Interactive database behavior',
    body: 'Lock waits, B-tree traversal, MVCC visibility, query planning, and replication flows are built as React simulations.',
    icon: LockKeyhole
  },
  {
    title: 'Ordered navigation',
    body: 'A collapsible sidebar plus previous and next links make the notes feel like a real guided path.',
    icon: Route
  }
];

export default function HomePage() {
  return (
    <AppShell>
      <div className="content-frame">
        <section className="note-article" aria-labelledby="home-title">
          <div className="mb-8 border-b border-yc-border pb-8">
            <p className="mb-3 text-xs font-bold uppercase text-yc-accent">PostgreSQL Learning Journey</p>
            <h1 id="home-title">Database notes that grow from zero to production depth.</h1>
            <p className="mt-5 max-w-2xl text-lg text-yc-text-secondary">
              A Next.js notes app for learning PostgreSQL through one realistic schema, runnable SQL,
              production tradeoffs, and visual walkthroughs.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="focus-ring inline-flex items-center gap-2 rounded-md bg-yc-accent px-4 py-2 text-sm font-bold text-white hover:bg-yc-accent-hover"
                href="/notes"
              >
                Start learning
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                className="focus-ring inline-flex items-center gap-2 rounded-md border border-yc-border bg-yc-bg-alt px-4 py-2 text-sm font-bold hover:border-yc-accent"
                href="/notes/08-transactions-locking/seat-locking"
              >
                See locking demo
              </Link>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-lg border border-yc-border bg-yc-bg-alt p-5">
                  <Icon className="mb-5 h-5 w-5 text-yc-accent" aria-hidden="true" />
                  <h2 className="m-0 border-0 p-0 text-base">{item.title}</h2>
                  <p className="mt-2 text-sm text-yc-text-secondary">{item.body}</p>
                </article>
              );
            })}
          </div>

          <section aria-labelledby="curriculum-title">
            <h2 id="curriculum-title">Curriculum map</h2>
            <div className="note-table-wrap">
              <table className="note-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Subtopics</th>
                    <th>Focus</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => (
                    <tr key={topic.id}>
                      <td>{topic.title}</td>
                      <td>{topic.subtopics.length}</td>
                      <td>{topic.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </AppShell>
  );
}
