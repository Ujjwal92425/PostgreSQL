'use client';

import { useState } from 'react';
import { Database, Search, Filter, Key } from 'lucide-react';
import { learningSchema } from '@/lib/schema';

export function SchemaMap() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  const topicFilters = [
    'all',
    'keys',
    'JSONB',
    'transactions',
    'normalization',
    'indexes',
    'partitioning',
    'security'
  ];

  const filteredSchema = learningSchema.filter((table) => {
    const matchesSearch =
      table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      table.columns.some((col) => col.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTopic =
      selectedTopic === 'all' ||
      table.topicFit.toLowerCase().includes(selectedTopic.toLowerCase());

    return matchesSearch && matchesTopic;
  });

  return (
    <div className="mt-6 space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/90 p-4">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tables, columns, or keys..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs font-bold text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" /> Topic:
          </span>
          {topicFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedTopic(filter)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition ${
                selectedTopic === filter
                  ? 'bg-sky-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Schema Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredSchema.map((table) => (
          <article
            key={table.name}
            className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-sky-500/40 hover:bg-slate-900/90"
          >
            <div className="flex items-start justify-between">
              <h3 className="m-0 flex items-center gap-2 text-base font-bold text-slate-100">
                <Database className="h-4 w-4 text-sky-400" />
                {table.name}
              </h3>
              <span className="rounded bg-sky-950/80 px-2 py-0.5 text-[10px] font-bold text-sky-400 border border-sky-800/40">
                Table
              </span>
            </div>

            <p className="mb-3 mt-1.5 text-xs text-slate-400">{table.purpose}</p>

            <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Columns &amp; Data Types
              </div>
              <ul className="m-0 space-y-1 p-0 text-xs font-mono text-slate-300">
                {table.columns.map((column) => (
                  <li key={column} className="flex items-center gap-2">
                    {column.includes('primary key') ? (
                      <Key className="h-3 w-3 shrink-0 text-amber-400" />
                    ) : column.includes('references') ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-600" />
                    )}
                    <span className={column.includes('primary key') ? 'font-bold text-amber-300' : ''}>
                      {column}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="font-bold text-orange-400">Used in:</span>
              <span className="font-mono text-slate-400">{table.topicFit}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
