import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getPagePosition } from '@/lib/curriculum';

type PrevNextNavProps = {
  topicId: string;
  slug: string;
  placement: 'header' | 'footer';
};

export function PrevNextNav({ topicId, slug, placement }: PrevNextNavProps) {
  const { previous, next } = getPagePosition(topicId, slug);

  if (!previous && !next) {
    return null;
  }

  return (
    <div className={placement === 'header' ? 'mb-8 flex gap-3' : 'mt-12 flex gap-3 border-t border-yc-border pt-6'}>
      {previous ? (
        <Link className="nav-card focus-ring" href={previous.href}>
          <span className="flex items-center gap-2 text-xs font-bold uppercase text-yc-text-muted">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </span>
          <span className="truncate text-sm font-bold">{previous.title}</span>
        </Link>
      ) : (
        <div className="hidden flex-1 md:block" />
      )}

      {next ? (
        <Link className="nav-card focus-ring text-right" href={next.href}>
          <span className="flex items-center justify-end gap-2 text-xs font-bold uppercase text-yc-text-muted">
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="truncate text-sm font-bold">{next.title}</span>
        </Link>
      ) : (
        <div className="hidden flex-1 md:block" />
      )}
    </div>
  );
}
