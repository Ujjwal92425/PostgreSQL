import { BtreeIndexSimulation } from '@/components/diagrams/BtreeIndexSimulation';
import { ExplainAnalyzeSimulation } from '@/components/diagrams/ExplainAnalyzeSimulation';
import { JoinAlgorithmsSimulation } from '@/components/diagrams/JoinAlgorithmsSimulation';
import { MvccVisibilitySimulation } from '@/components/diagrams/MvccVisibilitySimulation';
import { SchemaMap } from '@/components/diagrams/SchemaMap';
import { SeatLockingSimulation } from '@/components/diagrams/SeatLockingSimulation';
import { VacuumBloatSimulation } from '@/components/diagrams/VacuumBloatSimulation';
import { WalPipelineSimulation } from '@/components/diagrams/WalPipelineSimulation';
import { NotePage, NoteSection } from '@/content/notes';
import { CodeBlock } from './CodeBlock';
import { NoteTable } from './NoteTable';

function renderInteractive(visual: Extract<NoteSection, { type: 'interactive' }>['visual']) {
  switch (visual) {
    case 'seat-locking':
      return <SeatLockingSimulation />;
    case 'btree-index':
      return <BtreeIndexSimulation />;
    case 'mvcc-visibility':
      return <MvccVisibilitySimulation />;
    case 'join-algorithms':
      return <JoinAlgorithmsSimulation />;
    case 'explain-analyze':
      return <ExplainAnalyzeSimulation />;
    case 'wal-pipeline':
      return <WalPipelineSimulation />;
    case 'vacuum-bloat':
      return <VacuumBloatSimulation />;
    case 'schema-map':
    default:
      return <SchemaMap />;
  }
}

export function NoteRenderer({ page }: { page: NotePage }) {
  const getBadgeClass = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes('begin')) return 'level-badge level-beginner';
    if (l.includes('interm')) return 'level-badge level-intermediate';
    if (l.includes('adv')) return 'level-badge level-advanced';
    return 'level-badge level-production';
  };

  return (
    <article className="note-article">
      <div className="mb-8 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className={getBadgeClass(page.level)}>{page.level}</span>
          <span className="text-xs font-mono text-slate-400">⏱️ {page.readingTime} read</span>
        </div>
        <h1>{page.title}</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300 leading-relaxed">{page.description}</p>
      </div>

      {page.sections.map((section, index) => {
        const key = `${page.slug}-${index}`;

        if (section.type === 'paragraph') {
          return (
            <section key={key} aria-labelledby={`${key}-title`}>
              {section.title ? <h2 id={`${key}-title`}>{section.title}</h2> : null}
              {section.body.map((paragraph, pIdx) => (
                <p key={`${key}-p-${pIdx}`}>{paragraph}</p>
              ))}
            </section>
          );
        }

        if (section.type === 'list') {
          return (
            <section key={key} aria-labelledby={`${key}-title`}>
              <h2 id={`${key}-title`}>{section.title}</h2>
              <ul className="space-y-2">
                {section.items.map((item, itemIdx) => (
                  <li key={`${key}-li-${itemIdx}`}>{item}</li>
                ))}
              </ul>
            </section>
          );
        }

        if (section.type === 'code') {
          return (
            <section key={key} aria-labelledby={`${key}-title`}>
              <h2 id={`${key}-title`}>{section.title}</h2>
              <CodeBlock code={section.code} language={section.language} title={section.language} />
            </section>
          );
        }

        if (section.type === 'table') {
          return (
            <section key={key} aria-labelledby={`${key}-title`}>
              <h2 id={`${key}-title`}>{section.title}</h2>
              <NoteTable headers={section.headers} rows={section.rows} />
            </section>
          );
        }

        if (section.type === 'callout') {
          return (
            <section key={key} className="callout" aria-labelledby={`${key}-title`}>
              <p className="callout-title" id={`${key}-title`}>
                💡 {section.title}
              </p>
              <p>{section.body}</p>
            </section>
          );
        }

        return (
          <section key={key} aria-labelledby={`${key}-title`}>
            <h2 id={`${key}-title`}>{section.title}</h2>
            {renderInteractive(section.visual)}
          </section>
        );
      })}
    </article>
  );
}
