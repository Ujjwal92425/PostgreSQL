import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PrevNextNav } from '@/components/layout/PrevNextNav';
import { NoteRenderer } from '@/components/notes/NoteRenderer';
import { getNotePage, NotePage } from '@/content/notes';
import { orderedPages, topics } from '@/lib/curriculum';

type NoteRouteProps = {
  params: Promise<{
    topic: string;
    slug: string;
  }>;
};

function createPlannedPage(topicId: string, slug: string): NotePage | undefined {
  const topic = topics.find((item) => item.id === topicId);
  const subtopic = topic?.subtopics.find((item) => item.slug === slug);

  if (!topic || !subtopic) {
    return undefined;
  }

  return {
    topicId,
    slug,
    title: subtopic.title,
    description: `${topic.summary} This page is scaffolded into the learning flow and ready for deep content expansion.`,
    level: subtopic.level,
    readingTime: 'Draft',
    sections: [
      {
        type: 'paragraph',
        title: '1. Definition in simple English',
        body: [
          'This subtopic has its own production route and layout. The full note will follow the same structure as the completed pages: simple definition, use, schema, query, result, internals, mistakes, production notes, interview angle, and practice.'
        ]
      },
      {
        type: 'list',
        title: '2. Content checklist',
        items: [
          'Add plain-English definition and mental model.',
          'Use the shared production schema for examples.',
          'Include runnable PostgreSQL queries and expected output tables.',
          'Explain PostgreSQL internals and production tradeoffs.',
          'Add an interactive simulation if the concept is dynamic.'
        ]
      }
    ]
  };
}

export function generateStaticParams() {
  return orderedPages.map((page) => ({
    topic: page.topicId,
    slug: page.slug
  }));
}

export async function generateMetadata({ params }: NoteRouteProps): Promise<Metadata> {
  const { topic, slug } = await params;
  const page = getNotePage(topic, slug) ?? createPlannedPage(topic, slug);

  return {
    title: page ? `${page.title} | PostgreSQL Learning Journey` : 'PostgreSQL Learning Journey',
    description: page?.description
  };
}

export default async function NoteRoutePage({ params }: NoteRouteProps) {
  const { topic, slug } = await params;
  const page = getNotePage(topic, slug) ?? createPlannedPage(topic, slug);

  if (!page) {
    notFound();
  }

  return (
    <AppShell>
      <div className="content-frame">
        <NoteRenderer page={page} />
        <PrevNextNav placement="footer" slug={slug} topicId={topic} />
      </div>
    </AppShell>
  );
}
