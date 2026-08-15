'use client';

import { useState } from 'react';
import { Activity, Play, RotateCcw, ChevronRight, Zap } from 'lucide-react';

type PlanNode = {
  nodeType: string;
  cost: string;
  rowsEstimate: number;
  rowsActual: number;
  loops: number;
  time: string;
  filter?: string;
  rowsRemovedByFilter?: number;
  indexCond?: string;
  tip: string;
};

type QueryPlan = {
  queryName: string;
  querySql: string;
  totalCost: string;
  executionTime: string;
  nodes: PlanNode[];
};

const queryPlans: QueryPlan[] = [
  {
    queryName: 'Unindexed Scan (Bad Performance)',
    querySql: 'SELECT * FROM orders WHERE total > 500.00 AND status = "paid";',
    totalCost: '1420.50',
    executionTime: '84.2 ms',
    nodes: [
      {
        nodeType: 'Seq Scan on orders',
        cost: '0.00..1420.50',
        rowsEstimate: 120,
        rowsActual: 118,
        loops: 1,
        time: '82.4 ms',
        filter: '(total > 500.00 AND status = "paid")',
        rowsRemovedByFilter: 49882,
        tip: 'Sequential scan reads all 50,000 table pages from disk! Filter discards 99.7% of rows.'
      }
    ]
  },
  {
    queryName: 'Indexed Scan (Optimized)',
    querySql: 'SELECT * FROM orders WHERE user_id = "u_9021" ORDER BY created_at DESC LIMIT 10;',
    totalCost: '8.45',
    executionTime: '0.12 ms',
    nodes: [
      {
        nodeType: 'Limit',
        cost: '0.29..8.45',
        rowsEstimate: 10,
        rowsActual: 10,
        loops: 1,
        time: '0.11 ms',
        tip: 'Top-10 result bounded immediately.'
      },
      {
        nodeType: 'Index Scan Scan Backward using orders_user_created_idx',
        cost: '0.29..8.45',
        rowsEstimate: 10,
        rowsActual: 10,
        loops: 1,
        time: '0.09 ms',
        indexCond: '(user_id = "u_9021")',
        tip: 'Index scan directly hits matching B-Tree leaf pages in reverse order!'
      }
    ]
  }
];

export function ExplainAnalyzeSimulation() {
  const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
  const [activeNodeIdx, setActiveNodeIdx] = useState(0);

  const plan = queryPlans[selectedPlanIdx];
  const currentNode = plan.nodes[activeNodeIdx] || plan.nodes[0];

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <div>
          <span className="simulation-label">
            <Activity className="h-3.5 w-3.5" /> Planner &amp; Optimizer Inspector
          </span>
          <p className="simulation-title">Reading EXPLAIN ANALYZE Execution Trees</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="sim-btn"
            type="button"
            onClick={() => setActiveNodeIdx(0)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            className="sim-btn bg-amber-600 text-white hover:bg-amber-500 border-amber-500"
            type="button"
            onClick={() => setActiveNodeIdx((prev) => (prev + 1) % plan.nodes.length)}
          >
            Next Node <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="simulation-canvas">
        {/* Scenario Toggle */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3">
          <div className="flex gap-2">
            {queryPlans.map((qp, idx) => (
              <button
                key={qp.queryName}
                type="button"
                onClick={() => {
                  setSelectedPlanIdx(idx);
                  setActiveNodeIdx(0);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  selectedPlanIdx === idx
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {qp.queryName}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Estimated Cost:</span>{' '}
              <strong className="text-amber-400">{plan.totalCost}</strong>
            </div>
            <div>
              <span className="text-slate-400">Actual Time:</span>{' '}
              <strong className="text-emerald-400">{plan.executionTime}</strong>
            </div>
          </div>
        </div>

        {/* Query SQL */}
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-sky-300">
          {plan.querySql}
        </div>

        {/* Execution Tree Nodes */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Query Plan Tree Nodes
          </div>
          {plan.nodes.map((node, idx) => (
            <div
              key={node.nodeType}
              onClick={() => setActiveNodeIdx(idx)}
              className={`cursor-pointer rounded-lg border p-4 transition ${
                activeNodeIdx === idx
                  ? 'border-amber-500/60 bg-amber-950/20 text-amber-100 shadow-lg'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-slate-100 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  {node.nodeType}
                </span>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {node.time}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 sm:grid-cols-4">
                <div>
                  Cost: <span className="text-amber-300">{node.cost}</span>
                </div>
                <div>
                  Est Rows: <span className="text-sky-300">{node.rowsEstimate}</span>
                </div>
                <div>
                  Actual Rows: <span className="text-emerald-300">{node.rowsActual}</span>
                </div>
                <div>
                  Loops: <span className="text-purple-300">{node.loops}</span>
                </div>
              </div>

              {node.filter && (
                <div className="mt-2 text-[11px] font-mono text-red-300">
                  Filter: {node.filter} (Discarded {node.rowsRemovedByFilter} rows)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sim-step flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-500/20 p-1 text-amber-400">
          <Play className="h-4 w-4" />
        </div>
        <div>
          <strong className="text-white">Optimizer Insight:</strong> {currentNode.tip}
        </div>
      </div>
    </div>
  );
}
