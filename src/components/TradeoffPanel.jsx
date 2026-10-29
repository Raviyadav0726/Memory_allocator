import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

const TRADEOFFS = {
  first: {
    complexity: 'O(N)',
    spaceEfficiency: 'Low',
    speed: 'Fast',
    fragType: 'External',
    detail: 'First Fit stops at the very first gap large enough. This means early memory addresses get clustered, leaving many small holes later — classic external fragmentation. It is, however, the fastest algorithm with the lowest scan overhead.',
    pros: ['Minimal scan cost', 'Simple to implement', 'Low CPU overhead'],
    cons: ['Heavy early-address clustering', 'Leaves many small fragments', 'Poor long-term utilisation'],
  },
  best: {
    complexity: 'O(N)',
    spaceEfficiency: 'High',
    speed: 'Slow',
    fragType: 'External (tiny holes)',
    detail: 'Best Fit scans all memory to find the smallest gap that fits. While this minimises wasted space per allocation, it paradoxically creates many tiny, near-unusable holes over time — and always pays the full O(N) scan cost regardless of early success.',
    pros: ['Minimises space waste per alloc', 'Better long-term utilisation', 'Predictable placement'],
    cons: ['Always O(N) scans', 'Creates tiny unusable holes', 'Slowest steady-state overhead'],
  },
  worst: {
    complexity: 'O(N)',
    spaceEfficiency: 'Medium',
    speed: 'Slow',
    fragType: 'Internal (large remnants)',
    detail: 'Worst Fit deliberately picks the largest gap, leaving the biggest possible remnant. The theory is that large remnants can satisfy future requests. In practice this backfires under mixed workloads, and it always incurs a full O(N) sweep.',
    pros: ['Leaves large remnant holes', 'Good for uniform-size requests', 'Prevents tiny-hole proliferation'],
    cons: ['Always O(N) scans', 'Fails under mixed-size workloads', 'Premature memory exhaustion'],
  },
  next: {
    complexity: 'O(N) worst-case',
    spaceEfficiency: 'Medium',
    speed: 'Fast average',
    fragType: 'Distributed external',
    detail: 'Next Fit resumes from the last allocation pointer, distributing pressure evenly across memory. This prevents front-heavy clustering and saves scan time on average. However, in the worst case (wrap-around), it may scan the full array. The pointer is the key novelty.',
    pros: ['Avoids front-clustering', 'Fast average-case scans', 'Good memory distribution'],
    cons: ['Harder to implement correctly', 'Wrap-around may scan all of memory', 'Pointer state adds complexity'],
  },
};

const SPEED_COLOUR = { Fast: 'text-emerald-400', 'Fast average': 'text-emerald-400', Slow: 'text-red-400' };
const SPACE_COLOUR = { High: 'text-emerald-400', Medium: 'text-yellow-400', Low: 'text-red-400' };

export function TradeoffPanel({ algoKey }) {
  const [open, setOpen] = useState(false);
  const t = TRADEOFFS[algoKey];

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
      >
        <span className="flex items-center gap-1.5"><Info size={12} /> Algorithm Trade-off Analysis</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs space-y-3 leading-relaxed animate-in fade-in slide-in-from-top-1">
          {/* Quick stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-slate-800/60">
              <div className="text-slate-400 mb-0.5">Complexity</div>
              <div className="font-mono font-bold text-purple-400">{t.complexity}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-800/60">
              <div className="text-slate-400 mb-0.5">Speed</div>
              <div className={`font-bold ${SPEED_COLOUR[t.speed]}`}>{t.speed}</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-slate-800/60">
              <div className="text-slate-400 mb-0.5">Space</div>
              <div className={`font-bold ${SPACE_COLOUR[t.spaceEfficiency]}`}>{t.spaceEfficiency}</div>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-slate-300">{t.detail}</p>

          {/* Pros / Cons */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-emerald-400 font-semibold mb-1">✓ Pros</div>
              <ul className="space-y-0.5">
                {t.pros.map(p => <li key={p} className="text-slate-300 flex gap-1"><span className="text-emerald-500">+</span>{p}</li>)}
              </ul>
            </div>
            <div>
              <div className="text-red-400 font-semibold mb-1">✗ Cons</div>
              <ul className="space-y-0.5">
                {t.cons.map(c => <li key={c} className="text-slate-300 flex gap-1"><span className="text-red-500">−</span>{c}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
