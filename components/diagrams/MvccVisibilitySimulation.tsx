'use client';

import { useState } from 'react';
import { Eye, Play, RotateCcw, ChevronRight, Check, X } from 'lucide-react';

const mvccSteps = [
  {
    step: 1,
    title: '1. Initial State (Transaction Tx 100 Created Rows)',
    isolationLevel: 'READ COMMITTED',
    readerTx: 'Tx 105',
    tuples: [
      { id: 1, name: 'Maya', xmin: 100, xmax: 0, status: 'visible', desc: 'Inserted by Tx 100. Committed.' },
      { id: 2, name: 'Sam', xmin: 100, xmax: 0, status: 'visible', desc: 'Inserted by Tx 100. Committed.' }
    ],
    explanation: 'Tx 105 reads active heap. Tuples with xmin <= 105 and xmax = 0 (or uncommitted xmax) are visible to Tx 105 snapshot.'
  },
  {
    step: 2,
    title: '2. Concurrent UPDATE by Tx 102 (Uncommitted)',
    isolationLevel: 'READ COMMITTED',
    readerTx: 'Tx 105',
    tuples: [
      { id: 1, name: 'Maya', xmin: 100, xmax: 102, status: 'visible', desc: 'Old Tuple version: xmax set to Tx 102. Still visible to Tx 105 because Tx 102 is uncommitted!' },
      { id: 1, name: 'Maya (VIP)', xmin: 102, xmax: 0, status: 'invisible', desc: 'New Tuple version: xmin = 102. Invisible to Tx 105 until Tx 102 commits.' },
      { id: 2, name: 'Sam', xmin: 100, xmax: 0, status: 'visible', desc: 'Unmodified tuple.' }
    ],
    explanation: 'PostgreSQL MVCC does NOT overwrite tuples in place. UPDATE creates a new tuple version (xmin=102) and flags old tuple xmax=102. Tx 105 still sees old version!'
  },
  {
    step: 3,
    title: '3. Tx 102 Commits UPDATE',
    isolationLevel: 'READ COMMITTED',
    readerTx: 'Tx 105 (Next Query Snapshot)',
    tuples: [
      { id: 1, name: 'Maya', xmin: 100, xmax: 102, status: 'invisible', desc: 'Old version now expired (xmax committed).' },
      { id: 1, name: 'Maya (VIP)', xmin: 102, xmax: 0, status: 'visible', desc: 'New version visible to fresh snapshot at statement start.' },
      { id: 2, name: 'Sam', xmin: 100, xmax: 0, status: 'visible', desc: 'Unmodified tuple.' }
    ],
    explanation: 'Under READ COMMITTED, each SQL statement acquires a fresh snapshot. Statement 2 now sees "Maya (VIP)".'
  },
  {
    step: 4,
    title: '4. REPEATABLE READ Isolation Contrast',
    isolationLevel: 'REPEATABLE READ',
    readerTx: 'Tx 105 (Transaction-level Snapshot)',
    tuples: [
      { id: 1, name: 'Maya', xmin: 100, xmax: 102, status: 'visible', desc: 'Visible! Snapshot locked at Tx 105 transaction start (tx 102 commit ignored).' },
      { id: 1, name: 'Maya (VIP)', xmin: 102, xmax: 0, status: 'invisible', desc: 'Invisible! Tx 102 committed AFTER snapshot start.' },
      { id: 2, name: 'Sam', xmin: 100, xmax: 0, status: 'visible', desc: 'Unmodified tuple.' }
    ],
    explanation: 'Under REPEATABLE READ, the snapshot is taken ONCE at transaction start. Re-running the SELECT returns identical rows!'
  }
];

export function MvccVisibilitySimulation() {
  const [activeStep, setActiveStep] = useState(0);

  const current = mvccSteps[activeStep];

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <Eye className="h-3.5 w-3.5" /> MVCC Internals Simulation
          </span>
          <p className="simulation-title">Tuple Visibility &amp; Snapshot Isolation Mechanics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="sim-btn"
            type="button"
            onClick={() => setActiveStep(0)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            className="sim-btn bg-purple-600 text-white hover:bg-purple-500 border-purple-500"
            type="button"
            onClick={() => setActiveStep((prev) => (prev + 1) % mvccSteps.length)}
          >
            Next Step <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase mr-2">Active Isolation Level:</span>
            <span className="rounded bg-purple-950 px-2.5 py-1 font-mono font-bold text-purple-300 border border-purple-800/40">
              {current.isolationLevel}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold uppercase mr-2">Reader Transaction:</span>
            <span className="font-mono text-sky-400 font-bold">{current.readerTx}</span>
          </div>
        </div>

        {/* Tuples Heap View */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Physical Heap Tuples (users Table Page)
          </div>
          <div className="space-y-2">
            {current.tuples.map((t, idx) => (
              <div
                key={`${t.name}-${idx}`}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 font-mono text-xs transition ${
                  t.status === 'visible'
                    ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-100'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {t.status === 'visible' ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div>
                    <span className="font-bold text-slate-200">{t.name}</span> (ID: {t.id})
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px]">
                  <span>
                    xmin: <strong className="text-sky-400">{t.xmin}</strong>
                  </span>
                  <span>
                    xmax: <strong className="text-amber-400">{t.xmax}</strong>
                  </span>
                  <span className={`rounded px-2 py-0.5 font-bold ${
                    t.status === 'visible' ? 'bg-emerald-900/60 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-purple-500/20 p-1 text-purple-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">{current.title}:</strong> {current.explanation}
        </div>
      </div>
    </div>
  );
}
