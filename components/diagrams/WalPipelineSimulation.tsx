'use client';

import { useState } from 'react';
import { HardDrive, Play, RotateCcw, ChevronRight, ShieldCheck } from 'lucide-react';

const walSteps = [
  {
    step: 1,
    stage: '1. Shared Buffers Modification',
    bufferState: 'Dirty Page (in-memory)',
    walState: 'Not written',
    diskState: 'Unchanged',
    lsn: 'LSN 0/1A049B0',
    desc: 'Transaction executes UPDATE. The page in Shared Buffers is modified in memory and marked DIRTY.'
  },
  {
    step: 2,
    stage: '2. WAL Record Appended to WAL Buffer',
    bufferState: 'Dirty Page (in-memory)',
    walState: 'Buffered in RAM (WAL Buffer)',
    diskState: 'Unchanged',
    lsn: 'LSN 0/1A04A00',
    desc: 'PostgreSQL generates a sequential Write-Ahead Log (WAL) record describing the byte-level diff.'
  },
  {
    step: 3,
    stage: '3. COMMIT & Flush WAL to Disk (fsync)',
    bufferState: 'Dirty Page (in-memory)',
    walState: 'FLUSHED to WAL Segment File on Disk!',
    diskState: 'Crash-Safe Durability Guaranteed',
    lsn: 'LSN 0/1A04A00 (flushed)',
    desc: 'COMMIT executes. PostgreSQL forces write() + fsync() on the WAL segment file on disk before returning success!'
  },
  {
    step: 4,
    stage: '4. Background Checkpointer (Dirty Page Flush)',
    bufferState: 'Clean Page',
    walState: 'Archived',
    diskState: 'Data File (base/16384) Synced to Disk',
    lsn: 'LSN 0/1A04A00 (checkpointed)',
    desc: 'Later, the Background Checkpointer asynchronously writes dirty heap pages from Shared Buffers to table files on disk.'
  }
];

export function WalPipelineSimulation() {
  const [activeStep, setActiveStep] = useState(0);

  const current = walSteps[activeStep];

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <HardDrive className="h-3.5 w-3.5" /> ACID Durability Pipeline
          </span>
          <p className="simulation-title">Write-Ahead Logging (WAL) &amp; fsync Commit Lifecycle</p>
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
            className="sim-btn bg-cyan-600 text-white hover:bg-cyan-500 border-cyan-500"
            type="button"
            onClick={() => setActiveStep((prev) => (prev + 1) % walSteps.length)}
          >
            Next Step <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-400 font-bold uppercase">Log Sequence Number:</span>
            <span className="font-mono text-cyan-400 font-bold">{current.lsn}</span>
          </div>
          <div className="text-slate-400">Step {activeStep + 1} of 4</div>
        </div>

        {/* 3 Pipeline Components */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Shared Buffers */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2">
              1. Shared Buffers (RAM)
            </div>
            <div className={`p-3 rounded border font-mono text-xs ${
              activeStep >= 0 ? 'border-amber-500/60 bg-amber-950/20 text-amber-200' : 'border-slate-800 bg-slate-900'
            }`}>
              {current.bufferState}
            </div>
          </div>

          {/* WAL Buffers / Segment */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
              2. WAL Log File (Sequential Disk)
            </div>
            <div className={`p-3 rounded border font-mono text-xs ${
              activeStep >= 2 ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 font-bold' : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}>
              {current.walState}
            </div>
          </div>

          {/* Table Heap Files */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              3. Data Heap Files (Random Disk)
            </div>
            <div className={`p-3 rounded border font-mono text-xs ${
              activeStep === 3 ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold' : 'border-slate-800 bg-slate-900 text-slate-400'
            }`}>
              {current.diskState}
            </div>
          </div>
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-cyan-500/20 p-1 text-cyan-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">{current.stage}:</strong> {current.desc}
        </div>
      </div>
    </div>
  );
}
