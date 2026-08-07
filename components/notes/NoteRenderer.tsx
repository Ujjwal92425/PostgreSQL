import { BtreeIndexSimulation } from '@/components/diagrams/BtreeIndexSimulation';
import { SchemaMap } from '@/components/diagrams/SchemaMap';
import { SeatLockingSimulation } from '@/components/diagrams/SeatLockingSimulation';
import { NotePage, NoteSection } from '@/content/notes';
import { CodeBlock } from './CodeBlock';
import { NoteTable } from './NoteTable';

function renderInteractive(visual: Extract<NoteSection, { type: 'interactive' }>['visual']) {
  if (visual === 'seat-locking') {
    return <SeatLockingSimulation />;
  }

  if (visual === 'btree-index') {
    return <BtreeIndexSimulation />;
  }

  return <SchemaMap />;
}

export function NoteRenderer({ page }: { page: NotePage }) {
  return (
    <article className="note-article">
      <div className="mb-8 border-b border-yc-border pb-8">
        <h1>{page.title}</h1>
        <p className="mt-5 max-w-2xl text-lg text-yc-text-secondary">{page.description}</p>
      </div>

      {page.sections.map((section, index) => {
        const key = `${page.slug}-${index}`;

        if (section.type === 'paragraph') {
          return (
            <section key={key} aria-labelledby={`${key}-title`}>
              {section.title ? <h2 id={`${key}-title`}>{section.title}</h2> : null}
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          );
        }

        if (section.type === 'list') {
          return (
            <section key={key} aria-labelledby={`${key}-title`}>
              <h2 id={`${key}-title`}>{section.title}</h2>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
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
                {section.title}
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
