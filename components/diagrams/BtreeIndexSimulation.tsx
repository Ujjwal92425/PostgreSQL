'use client';

import { useState } from 'react';
import { Play, RotateCcw, ChevronRight, Search } from 'lucide-react';

const searchScenarios = [
  {
    targetKey: 'maya@example.com',
    steps: [
      { step: 1, node: 'Root Node [g... | r...]', desc: 'Evaluate query: lower(email) = "maya@example.com". Start at B-tree root page.', highlight: 'root' },
      { step: 2, node: 'Internal Node [g...q...]', desc: 'Compare "m" against root keys. "m" is between "g" and "r". Descend to child page 2.', highlight: 'internal-2' },
      { step: 3, node: 'Leaf Page [lee... | maya... | nora...]', desc: 'Binary search leaf entries for "maya@example.com". Entry found at offset 2!', highlight: 'leaf-maya' },
      { step: 4, node: 'Heap Tuple Pointer (Block 42, Offset 7)', desc: 'Follow Tuple Pointer (CTID (42,7)) to fetch full user row from physical heap table file.', highlight: 'heap-row' }
    ]
  },
  {
    targetKey: 'sam@example.com',
    steps: [
      { step: 1, node: 'Root Node [g... | r...]', desc: 'Evaluate query: lower(email) = "sam@example.com". Start at B-tree root page.', highlight: 'root' },
      { step: 2, node: 'Internal Node [r...z...]', desc: 'Compare "s" against root keys. "s" > "r". Descend to child page 3.', highlight: 'internal-3' },
      { step: 3, node: 'Leaf Page [rio... | sam... | zoe...]', desc: 'Binary search leaf entries for "sam@example.com". Entry found at offset 2!', highlight: 'leaf-sam' },
      { step: 4, node: 'Heap Tuple Pointer (Block 108, Offset 3)', desc: 'Follow Tuple Pointer (CTID (108,3)) to fetch full user row from heap table file.', highlight: 'heap-row' }
    ]
  }
];

export function BtreeIndexSimulation() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const scenario = searchScenarios[scenarioIdx];
  const currentStep = scenario.steps[activeStep];

  const handleNext = () => {
    setActiveStep((prev) => (prev + 1) % scenario.steps.length);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <Search className="h-3.5 w-3.5" /> Interactive B-Tree Visualizer
          </span>
          <p className="simulation-title">B-Tree Index Lookup & Heap Pointer Navigation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="sim-btn"
            type="button"
            onClick={handleReset}
            title="Reset Simulation"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            className="sim-btn bg-sky-600 text-white hover:bg-sky-500 border-sky-500"
            type="button"
            onClick={handleNext}
          >
            Next Step <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-slate-400">Search Target:</span>
            <div className="flex gap-2">
              {searchScenarios.map((sc, idx) => (
                <button
                  key={sc.targetKey}
                  type="button"
                  onClick={() => {
                    setScenarioIdx(idx);
                    setActiveStep(0);
                  }}
                  className={`rounded-md px-3 py-1 text-xs font-mono font-bold transition ${
                    scenarioIdx === idx
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sc.targetKey}
                </button>
              ))}
            </div>
          </div>
          <div className="text-xs font-mono text-slate-400">
            Step {activeStep + 1} of {scenario.steps.length}
          </div>
        </div>

        <div className="btree-grid">
          {/* Level 0: Root */}
          <div className="btree-row">
            <div className={`btree-node ${currentStep.highlight === 'root' ? 'btree-node-active' : ''}`}>
              <div className="text-[10px] font-bold text-sky-400">ROOT PAGE (Level 2)</div>
              <div className="mt-1">['g' | 'r']</div>
            </div>
          </div>

          {/* Level 1: Internal Pages */}
          <div className="btree-row">
            <div className={`btree-node ${currentStep.highlight === 'internal-1' ? 'btree-node-active' : ''}`}>
              <div className="text-[10px] text-slate-400 font-bold">PAGE #12</div>
              <div>['a'...'f']</div>
            </div>
            <div className={`btree-node ${currentStep.highlight === 'internal-2' ? 'btree-node-active' : ''}`}>
              <div className="text-[10px] text-slate-400 font-bold">PAGE #13</div>
              <div>['g'...'q']</div>
            </div>
            <div className={`btree-node ${currentStep.highlight === 'internal-3' ? 'btree-node-active' : ''}`}>
              <div className="text-[10px] text-slate-400 font-bold">PAGE #14</div>
              <div>['r'...'z']</div>
            </div>
          </div>

          {/* Level 2: Leaf Pages & Heap */}
          <div className="btree-row">
            <div
              className={`btree-node ${
                currentStep.highlight.includes('leaf') ? 'btree-node-active' : ''
              }`}
            >
              <div className="text-[10px] font-bold text-amber-400">LEAF PAGE #402</div>
              <div className="mt-1 space-y-0.5 text-[11px]">
                <div className={currentStep.highlight === 'leaf-maya' ? 'font-bold text-orange-400' : ''}>
                  "maya@example.com" -&gt; CTID (42,7)
                </div>
                <div className={currentStep.highlight === 'leaf-sam' ? 'font-bold text-orange-400' : ''}>
                  "sam@example.com" -&gt; CTID (108,3)
                </div>
              </div>
            </div>

            <div
              className={`btree-node ${
                currentStep.highlight === 'heap-row' ? 'btree-node-active' : ''
              }`}
            >
              <div className="text-[10px] font-bold text-emerald-400">HEAP TABLE PAGE</div>
              <div className="mt-1 text-[11px]">
                <div>Row Data: ID, Full Name, Email</div>
                <div className="text-[10px] text-slate-400">(Fetched in O(log N) page reads)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-sky-500/20 p-1 text-sky-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">{currentStep.node}:</strong> {currentStep.desc}
        </div>
      </div>
    </div>
  );
}
