import { learningSchema } from '@/lib/schema';

export function SchemaMap() {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {learningSchema.map((table) => (
        <article key={table.name} className="rounded-lg border border-yc-border bg-yc-bg-alt p-4">
          <h3 className="m-0 text-sm font-bold">{table.name}</h3>
          <p className="mb-3 mt-1 text-sm text-yc-text-muted">{table.purpose}</p>
          <ul className="m-0 space-y-1 p-0 text-xs text-yc-text-secondary">
            {table.columns.slice(0, 4).map((column) => (
              <li key={column} className="list-none font-mono">
                {column}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs font-bold text-yc-accent">{table.topicFit}</p>
        </article>
      ))}
    </div>
  );
}
