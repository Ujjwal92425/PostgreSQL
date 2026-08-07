'use client';

import { useMemo, useState } from 'react';

const steps = [
  'Buyer A starts a transaction and checks seat B7.',
  'Buyer B checks the same seat before A commits.',
  'A locks the seat row with SELECT FOR UPDATE.',
  'B waits because the row is locked.',
  'A inserts reservation and commits.',
  'B retries or receives a unique constraint error.'
];

export function SeatLockingSimulation() {
  const [activeStep, setActiveStep] = useState(0);
  const seatLabels = useMemo(() => ['A1', 'A2', 'A3', 'A4', 'A5', 'B5', 'B6', 'B7', 'B8', 'B9'], []);

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">Interactive live simulation</span>
          <p className="simulation-title">Seat reservation lock flow</p>
        </div>
        <button
          className="focus-ring rounded-md border border-[#34415c] bg-[#11192a] px-3 py-1 text-xs font-bold text-white hover:border-yc-accent"
          type="button"
          onClick={() => setActiveStep((activeStep + 1) % steps.length)}
        >
          Next step
        </button>
      </div>

      <div className="simulation-canvas">
        <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className={activeStep >= 0 ? 'sim-node' : 'sim-node'}>Buyer A</div>
              <div className={activeStep >= 1 ? 'sim-node' : 'sim-node'}>Buyer B</div>
            </div>

            <div className="seat-grid">
              {seatLabels.map((seat) => (
                <div key={seat} className={seat === 'B7' && activeStep >= 2 ? 'seat-cell seat-cell-active' : 'seat-cell'}>
                  {seat}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step} className={index === activeStep ? 'timeline-step timeline-step-active' : 'timeline-step'}>
                <span className="timeline-dot" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sim-step">
        Simulation spec: the database enforces one reservation per event and seat. The app still needs retry and user-facing failure handling.
      </div>
    </div>
  );
}
