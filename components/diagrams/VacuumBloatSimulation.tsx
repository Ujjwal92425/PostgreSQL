'use client';

import { useState } from 'react';
import { RefreshCw, Play, RotateCcw, ChevronRight, Trash2 } from 'lucide-react';

const vacuumSteps = [
  {
    step: 1,
    title: '1. Heavy UPDATE / DELETE Workload',
    deadTuples: 450,
    liveTuples: 550,
    bloatRatio: '45%',
    visibilityMap: 'Dirty (Pages contain dead tuples)',
    desc: 'Frequent UPDATEs and DELETEs leave dead tuple versions behind on table pages. Table file size expands (Bloat).'
  },
  {
    step: 2,
    title: '2. Autovacuum Daemon Triggered',
    deadTuples: 450,
    liveTuples: 550,
    bloatRatio: '45%',
    visibilityMap: 'Scanning Page Free Space Map',
    desc: 'Autovacuum worker wakes up when dead_tuples > autovacuum_vacuum_threshold + scale_factor * reltuples.'
  },
  {
    step: 3,
    title: '3. Dead Tuples Cleaned & Space Reclaimed to FSM',
    deadTuples: 0,
    liveTuples: 550,
    bloatRatio: '0% (Space reusable for future INSERTs)',
    visibilityMap: 'All Pages Set All-Visible Bit',
    desc: 'VACUUM sweeps dead tuples, updates index pointers, marks Visibility Map bits, and registers free space in FSM.'
  },
  {
    step: 4,
    title: '4. Vacuum Full (Exclusive Lock Compaction)',
    deadTuples: 0,
    liveTuples: 550,
    bloatRatio: '0% (Disk File Shrunk)',
    visibilityMap: 'Compact Clean File',
    desc: 'VACUUM FULL rebuilds table file on disk, returning physical space to OS, but takes an Exclusive Access Lock (AccessExclusiveLock).'
  }
];

export function VacuumBloatSimulation() {
  const [activeStep, setActiveStep] = useState(0);

  const current = vacuumSteps[activeStep];

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <RefreshCw className="h-3.5 w-3.5" /> Table Maintenance Simulation
          </span>
          <p className="simulation-title">VACUUM, Bloat Accumulation &amp; Visibility Map</p>
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
            className="sim-btn bg-teal-600 text-white hover:bg-teal-500 border-teal-500"
            type="button"
            onClick={() => setActiveStep((prev) => (prev + 1) % vacuumSteps.length)}
          >
            Next Step <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        <div className="mb-6 grid gap-4 grid-cols-2 md:grid-cols-4 font-mono text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400 block text-[10px]">LIVE TUPLES</span>
            <strong className="text-emerald-400 text-sm">{current.liveTuples}</strong>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400 block text-[10px]">DEAD TUPLES</span>
            <strong className="text-rose-400 text-sm flex items-center gap-1">
              <Trash2 className="h-3.5 w-3.5" /> {current.deadTuples}
            </strong>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400 block text-[10px]">BLOAT RATIO</span>
            <strong className="text-amber-400 text-sm">{current.bloatRatio}</strong>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-slate-400 block text-[10px]">VISIBILITY MAP</span>
            <strong className="text-teal-300 text-xs">{current.visibilityMap}</strong>
          </div>
        </div>

        {/* Visual Heap Page Grid */}
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Table Disk Pages Layout (Block 0..9)
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {Array.from({ length: 10 }).map((_, idx) => {
              const isDead = current.deadTuples > 0 && idx >= 5;
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded flex items-center justify-center font-mono text-xs font-bold border transition ${
                    isDead
                      ? 'border-rose-500/60 bg-rose-950/40 text-rose-300'
                      : 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                  }`}
                >
                  P#{idx}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-teal-500/20 p-1 text-teal-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">{current.title}:</strong> {current.desc}
        </div>
      </div>
    </div>
  );
}
