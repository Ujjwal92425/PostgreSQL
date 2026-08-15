'use client';

import { useMemo, useState } from 'react';
import { Lock, Play, RotateCcw, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';

const concurrencySteps = [
  {
    title: '1. Concurrent Requests Start',
    buyerA: 'BEGIN; SELECT id FROM seats WHERE id = "B7";',
    buyerB: 'BEGIN; SELECT id FROM seats WHERE id = "B7";',
    lockState: 'unlocked',
    activeSeat: 'B7',
    buyerAState: 'active',
    buyerBState: 'active',
    desc: 'Both Buyer A and Buyer B attempt to reserve Seat B7 at the exact same millisecond.'
  },
  {
    title: '2. Buyer A Acquires Exclusive Row Lock',
    buyerA: 'SELECT id FROM seats WHERE id = "B7" FOR UPDATE;',
    buyerB: 'SELECT id FROM seats WHERE id = "B7" FOR UPDATE; (Waiting...)',
    lockState: 'locked-by-A',
    activeSeat: 'B7',
    buyerAState: 'holding-lock',
    buyerBState: 'blocked',
    desc: 'Buyer A issues SELECT ... FOR UPDATE first. PostgreSQL places an Exclusive Row Lock (XLOCK) on tuple B7.'
  },
  {
    title: '3. Buyer B Enters Lock Wait Queue',
    buyerA: 'Processing reservation payload & payment...',
    buyerB: 'BLOCKED on lock wait queue for Tuple B7',
    lockState: 'locked-by-A',
    activeSeat: 'B7',
    buyerAState: 'holding-lock',
    buyerBState: 'blocked',
    desc: 'PostgreSQL halts Buyer B transaction until Buyer A completes or rolls back. No dirty overselling occurs.'
  },
  {
    title: '4. Buyer A Inserts & Commits',
    buyerA: 'INSERT INTO seat_reservations(...) VALUES ("B7"); COMMIT;',
    buyerB: 'Lock released! Buyer B transaction resumes.',
    lockState: 'reserved-A',
    activeSeat: 'B7',
    buyerAState: 'committed',
    buyerBState: 'resuming',
    desc: 'Buyer A commits. The row lock is released and tuple B7 now has a persistent reservation record.'
  },
  {
    title: '5. Unique Constraint Protects Seat Integrity',
    buyerA: 'Reservation Confirmed! Ticket #9021 issued.',
    buyerB: 'ERROR: duplicate key value violates unique constraint "seat_reservations_event_seat_uidx"',
    lockState: 'reserved-A',
    activeSeat: 'B7',
    buyerAState: 'committed',
    buyerBState: 'failed',
    desc: 'Buyer B attempts to insert, but UNIQUE (event_id, seat_id) blocks duplicate reservation safely!'
  }
];

export function SeatLockingSimulation() {
  const [activeStep, setActiveStep] = useState(0);
  const seatLabels = useMemo(() => ['A1', 'A2', 'A3', 'A4', 'A5', 'B5', 'B6', 'B7', 'B8', 'B9'], []);

  const current = concurrencySteps[activeStep];

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <Lock className="h-3.5 w-3.5" /> High-Concurrency Simulation
          </span>
          <p className="simulation-title">Seat Locking & Race Condition Prevention</p>
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
            className="sim-btn bg-orange-600 text-white hover:bg-orange-500 border-orange-500"
            type="button"
            onClick={() => setActiveStep((prev) => (prev + 1) % concurrencySteps.length)}
          >
            Next Step <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          {/* Buyer A state */}
          <div
            className={`rounded-lg border p-4 transition ${
              current.buyerAState === 'committed'
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : current.buyerAState === 'holding-lock'
                ? 'border-orange-500/50 bg-orange-950/20'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Transaction 1 (Buyer A)</span>
              {current.buyerAState === 'committed' && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle className="h-3.5 w-3.5" /> COMMITTED
                </span>
              )}
            </div>
            <pre className="mt-2 text-xs font-mono text-slate-300">{current.buyerA}</pre>
          </div>

          {/* Buyer B state */}
          <div
            className={`rounded-lg border p-4 transition ${
              current.buyerBState === 'failed'
                ? 'border-red-500/50 bg-red-950/20'
                : current.buyerBState === 'blocked'
                ? 'border-amber-500/50 bg-amber-950/20'
                : 'border-slate-800 bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Transaction 2 (Buyer B)</span>
              {current.buyerBState === 'blocked' && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                  <Lock className="h-3.5 w-3.5" /> LOCK WAITING
                </span>
              )}
              {current.buyerBState === 'failed' && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> UNIQUE VIOLATION
                </span>
              )}
            </div>
            <pre className="mt-2 text-xs font-mono text-slate-300">{current.buyerB}</pre>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Stadium Floorplan (Target Seat: B7)
            </div>
            <div className="seat-grid">
              {seatLabels.map((seat) => {
                const isTarget = seat === current.activeSeat;
                return (
                  <div
                    key={seat}
                    className={`seat-cell ${
                      isTarget && current.lockState === 'locked-by-A'
                        ? 'seat-cell-active border-orange-500 bg-orange-500/30 text-orange-200'
                        : isTarget && current.lockState === 'reserved-A'
                        ? 'border-emerald-500 bg-emerald-500/30 text-emerald-200 font-bold'
                        : ''
                    }`}
                  >
                    {seat}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Timeline Progress
            </div>
            {concurrencySteps.map((step, index) => (
              <div
                key={step.title}
                className={`timeline-step cursor-pointer p-1.5 rounded transition ${
                  index === activeStep ? 'timeline-step-active bg-slate-800' : 'hover:bg-slate-900'
                }`}
                onClick={() => setActiveStep(index)}
              >
                <span className="timeline-dot" />
                <span className="text-xs">{step.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-orange-500/20 p-1 text-orange-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">{current.title}:</strong> {current.desc}
        </div>
      </div>
    </div>
  );
}
