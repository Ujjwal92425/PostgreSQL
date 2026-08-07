'use client';

import { useState } from 'react';

const steps = [
  'Start at the root page.',
  'Pick the child range that could contain maya@example.com.',
  'Scan the leaf keys in sorted order.',
  'Use the tuple pointer to fetch the users row.'
];

export function BtreeIndexSimulation() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">Interactive live simulation</span>
          <p className="simulation-title">B-tree lookup for lower(email)</p>
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
        <div className="btree-grid">
          <div className="btree-row">
            <div className={activeStep >= 0 ? 'btree-node btree-node-active' : 'btree-node'}>root: g... | r...</div>
          </div>
          <div className="btree-row">
            <div className="btree-node">a...f...</div>
            <div className={activeStep >= 1 ? 'btree-node btree-node-active' : 'btree-node'}>g...q...</div>
            <div className="btree-node">r...z...</div>
          </div>
          <div className="btree-row">
            <div className={activeStep >= 2 ? 'btree-node btree-node-active' : 'btree-node'}>lee@...<br />maya@...<br />nora@...</div>
            <div className={activeStep >= 3 ? 'btree-node btree-node-active' : 'btree-node'}>heap tuple<br />users row</div>
          </div>
        </div>
      </div>

      <div className="sim-step">{steps[activeStep]}</div>
    </div>
  );
}
