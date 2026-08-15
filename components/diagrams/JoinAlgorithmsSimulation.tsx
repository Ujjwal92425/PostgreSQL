'use client';

import { useState } from 'react';
import { GitCommit, Play, RotateCcw, ChevronRight } from 'lucide-react';

const joinModes = [
  {
    mode: 'Nested Loop Join',
    complexity: 'O(N * M)',
    bestFor: 'Small outer table, indexed inner lookup',
    steps: [
      { step: 1, title: 'Read Outer Table Row 1', desc: 'Outer loop fetches row: order #101 (user_id = 42).' },
      { step: 2, title: 'Index Lookup in Inner Table', desc: 'Probe users_pkey index for user_id = 42. Found match: "Maya". Emit joined row.' },
      { step: 3, title: 'Read Outer Table Row 2', desc: 'Outer loop fetches row: order #102 (user_id = 88).' },
      { step: 4, title: 'Index Lookup in Inner Table', desc: 'Probe users_pkey index for user_id = 88. Found match: "Sam". Emit joined row.' }
    ]
  },
  {
    mode: 'Hash Join',
    complexity: 'O(N + M)',
    bestFor: 'Large unindexed tables, equality joins',
    steps: [
      { step: 1, title: 'Build Phase', desc: 'Scan inner table (users) and build an in-memory Hash Table on user_id key in WorkMem.' },
      { step: 2, title: 'Hash Table Ready', desc: 'Hash buckets populated: [Bucket 7: user 42 -> Maya], [Bucket 12: user 88 -> Sam].' },
      { step: 3, title: 'Probe Phase', desc: 'Scan outer table (orders) sequentially. Calculate hash(order.user_id) and lookup bucket.' },
      { step: 4, title: 'Match Emitted', desc: 'Hash bucket match found instantly! Joined rows streamed to query output.' }
    ]
  },
  {
    mode: 'Merge Join',
    complexity: 'O(N log N + M log M)',
    bestFor: 'Presorted inputs (e.g. index ordered or explicit SORT)',
    steps: [
      { step: 1, title: 'Check Input Ordering', desc: 'Both tables are ordered on user_id (e.g. via B-tree index scans).' },
      { step: 2, title: 'Dual Pointer Alignment', desc: 'Pointer 1 on orders(user_id=42), Pointer 2 on users(user_id=42). Values match!' },
      { step: 3, title: 'Emit Match & Advance', desc: 'Emit joined tuple. Advance pointer to next ordered key.' },
      { step: 4, title: 'Stream Output', desc: 'Single linear pass over both sorted inputs without extra memory allocation.' }
    ]
  }
];

export function JoinAlgorithmsSimulation() {
  const [selectedAlgo, setSelectedAlgo] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const currentAlgo = joinModes[selectedAlgo];
  const currentStep = currentAlgo.steps[activeStep];

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <GitCommit className="h-3.5 w-3.5" /> Execution Engine Simulation
          </span>
          <p className="simulation-title">Join Algorithms: Nested Loop vs Hash Join vs Merge Join</p>
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
            className="sim-btn bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500"
            type="button"
            onClick={() => setActiveStep((prev) => (prev + 1) % currentAlgo.steps.length)}
          >
            Next Step <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        {/* Selector Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex gap-2">
            {joinModes.map((algo, idx) => (
              <button
                key={algo.mode}
                type="button"
                onClick={() => {
                  setSelectedAlgo(idx);
                  setActiveStep(0);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  selectedAlgo === idx
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {algo.mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Time Complexity:</span>
            <span className="font-mono font-bold text-amber-400">{currentAlgo.complexity}</span>
          </div>
        </div>

        {/* Algo Canvas */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
              Outer Input Stream (orders)
            </div>
            <div className="space-y-1.5 font-mono text-xs text-slate-300">
              <div className={`p-2 rounded border ${activeStep % 2 === 0 ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold' : 'border-slate-800 bg-slate-900'}`}>
                Order #101 | user_id: 42 | total: $120.00
              </div>
              <div className={`p-2 rounded border ${activeStep % 2 === 1 ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold' : 'border-slate-800 bg-slate-900'}`}>
                Order #102 | user_id: 88 | total: $89.50
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
              Inner Input / Memory Structure (users)
            </div>
            <div className="space-y-1.5 font-mono text-xs text-slate-300">
              <div className="p-2 rounded border border-purple-900/50 bg-purple-950/20">
                User #42 | email: maya@example.com
              </div>
              <div className="p-2 rounded border border-purple-900/50 bg-purple-950/20">
                User #88 | email: sam@example.com
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
          <span className="font-bold text-slate-300">Planner Selection Rule:</span> {currentAlgo.bestFor}
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-emerald-500/20 p-1 text-emerald-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">{currentStep.title}:</strong> {currentStep.desc}
        </div>
      </div>
    </div>
  );
}
