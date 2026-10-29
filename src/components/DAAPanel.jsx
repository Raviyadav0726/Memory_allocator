import React, { useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALGO_COMPLEXITY = [
  {
    algo: 'First Fit',   hex: '#3b82f6',
    best: 'Ω(k)',    avg: 'Θ(n/2)',   worst: 'O(n)',
    space: 'O(1)',
    paradigm: 'Linear Search',
    caseNote: 'Terminates as soon as first fit found. Best case: hole at index 0.',
    radarData: { speed: 85, space: 95, fragResist: 45, simplicity: 90, fairness: 40 },
  },
  {
    algo: 'Best Fit',    hex: '#10b981',
    best: 'Ω(n)',    avg: 'Θ(n)',     worst: 'O(n)',
    space: 'O(1)',
    paradigm: 'Greedy (Minimize Waste)',
    caseNote: 'Always full sweep. Best, average, and worst case are all Θ(n).',
    radarData: { speed: 30, space: 90, fragResist: 80, simplicity: 65, fairness: 70 },
  },
  {
    algo: 'Worst Fit',   hex: '#ef4444',
    best: 'Ω(n)',    avg: 'Θ(n)',     worst: 'O(n)',
    space: 'O(1)',
    paradigm: 'Greedy (Maximize Remnant)',
    caseNote: 'Always full sweep. Consistently the heaviest overhead per allocation.',
    radarData: { speed: 30, space: 55, fragResist: 35, simplicity: 65, fairness: 55 },
  },
  {
    algo: 'Next Fit',    hex: '#f97316',
    best: 'Ω(1)',    avg: 'Θ(n/2)',   worst: 'O(n)',
    space: 'O(1) + pointer',
    paradigm: 'Circular Linear Search',
    caseNote: 'Amortised O(1) per operation in idealised uniform-size workloads.',
    radarData: { speed: 80, space: 85, fragResist: 55, simplicity: 75, fairness: 85 },
  },
];

const NOTATION_DEFS = [
  {
    symbol: 'O(f(n))',    name: 'Big-O (Asymptotic Upper Bound)',    color: 'text-red-400',
    meaning: 'The algorithm will NEVER do more work than this in the worst case. All four algorithms are O(n) — at most n slot checks per allocation.',
    formal: 'f(n) = O(g(n)) ↔ ∃c,n₀ : f(n) ≤ c·g(n) ∀n ≥ n₀',
  },
  {
    symbol: 'Ω(f(n))',    name: 'Big-Omega (Asymptotic Lower Bound)', color: 'text-emerald-400',
    meaning: 'The algorithm will ALWAYS do at least this much work. First Fit is Ω(k) where k is the gap index — it can stop early. Best/Worst Fit are Ω(n).',
    formal: 'f(n) = Ω(g(n)) ↔ ∃c,n₀ : f(n) ≥ c·g(n) ∀n ≥ n₀',
  },
  {
    symbol: 'Θ(f(n))',    name: 'Big-Theta (Tight Bound)',           color: 'text-blue-400',
    meaning: 'The algorithm runs in exactly this growth class both above and below. Best Fit/Worst Fit are Θ(n) — they always sweep all n slots.',
    formal: 'f(n) = Θ(g(n)) ↔ f(n) = O(g(n)) AND f(n) = Ω(g(n))',
  },
  {
    symbol: 'o(f(n))',    name: 'Little-o (Strict Upper)',           color: 'text-yellow-400',
    meaning: 'Strictly smaller growth, no constant factor can make them equal. None of these algorithms achieve o(n) without auxiliary data structures.',
    formal: 'f(n) = o(g(n)) ↔ lim(n→∞) f(n)/g(n) = 0',
  },
];

const PARADIGMS = [
  {
    name: 'Greedy Algorithm',
    icon: '⚡',
    color: 'border-yellow-500/30 bg-yellow-900/10',
    titleColor: 'text-yellow-400',
    desc: 'A greedy algorithm makes the locally optimal choice at each step, hoping to reach a global optimum. Best Fit and Worst Fit are textbook greedy algorithms.',
    examples: [
      'Best Fit: "Right now, pick the smallest gap ≥ size" — greedy on minimising wasted space.',
      'Worst Fit: "Right now, pick the largest gap" — greedy on maximising remnant size.',
    ],
    limitation: 'Greedy algorithms are NOT globally optimal for memory allocation. Best Fit can leave many tiny gaps; Worst Fit can leave no room for future large requests.',
    daaLink: 'Related AOA topics: Fractional Knapsack, Huffman Coding, Prim\'s/Kruskal\'s MST.',
  },
  {
    name: 'Linear Search (Exhaustive Scan)',
    icon: '🔍',
    color: 'border-blue-500/30 bg-blue-900/10',
    titleColor: 'text-blue-400',
    desc: 'First Fit and Next Fit apply linear search — scanning sequentially and returning on first success. This is the most efficient termination strategy when positions are unknown.',
    examples: [
      'First Fit: scan left→right, stop at index i if free[i..i+k-1] is contiguous.',
      'Next Fit: same but start from saved pointer p, wrap around once.',
    ],
    limitation: 'Without sorted/indexed metadata, you cannot do better than O(n) to find a qualifying gap. Interval trees reduce this to O(log n) but add O(n) space overhead.',
    daaLink: 'Related AOA topics: Binary Search, Sentinel Search, Interpolation Search.',
  },
  {
    name: 'Amortised Analysis',
    icon: '📊',
    color: 'border-purple-500/30 bg-purple-900/10',
    titleColor: 'text-purple-400',
    desc: 'Amortised analysis measures the average cost per operation over a sequence, even if individual operations occasionally cost more. Next Fit benefits from this strongly.',
    examples: [
      'Next Fit avoids re-scanning already-visited regions. Over m operations, total scans ≤ 2n — amortised O(1) per op in uniform workloads.',
      'Contrast: First Fit restarts from 0 each time — no amortisation benefit.',
    ],
    limitation: 'Amortised O(1) breaks down under adversarial workloads that force repeated wrap-arounds, degrading to O(n) per operation.',
    daaLink: 'Related AOA topics: Dynamic Array resize (amortised O(1) push), Splay Trees, Union-Find path compression.',
  },
  {
    name: 'Space-Time Tradeoff',
    icon: '⚖️',
    color: 'border-emerald-500/30 bg-emerald-900/10',
    titleColor: 'text-emerald-400',
    desc: 'A fundamental AOA principle: you can often reduce time complexity by spending more space (memory). All four algorithms here sacrifice time to save space (O(1) extra space).',
    examples: [
      'Improvement option 1: Maintain a sorted free-list → O(log n) search but O(n) space.',
      'Improvement option 2: Segregated free lists (one per size-class) → O(1) for exact fit, O(k) space for k size classes.',
    ],
    limitation: 'Modern allocators (jemalloc, tcmalloc) use exactly these techniques — size-class bins to achieve near-O(1) allocation. This simulator shows the unoptimised baseline.',
    daaLink: 'Related AOA topics: Hash Tables, B-Trees, Fibonacci Heaps.',
  },
  {
    name: 'Lower Bound Theory',
    icon: '📐',
    color: 'border-red-500/30 bg-red-900/10',
    titleColor: 'text-red-400',
    desc: 'AOA proves that WITHOUT any auxiliary data structure, no algorithm can find the best gap in better than O(n) — this is a proven lower bound, not just a limitation of the algorithms above.',
    examples: [
      'Proof sketch: With no preprocessing, any gap could be at any position. We must inspect at least one element from every possible location.',
      'With a self-balancing BST of free intervals: O(log n) per alloc. Space: O(n).',
    ],
    limitation: 'The O(n) lower bound applies only to comparison-based sequential scan. Augmented data structures break this bound by trading space.',
    daaLink: 'Related AOA topics: Lower bound proofs, Decision tree model, information-theoretic argument.',
  },
  {
    name: 'Recurrence Relations',
    icon: '🔁',
    color: 'border-orange-500/30 bg-orange-900/10',
    titleColor: 'text-orange-400',
    desc: 'Recurrence relations describe an algorithm\'s cost recursively. While our algorithms are iterative, understanding their cost through recurrence gives formal proof of complexity.',
    examples: [
      'First Fit scan cost: T(n) = T(n−1) + O(1), T(0) = 0 → T(n) = O(n)',
      'Next Fit amortised: across m calls on array of size n — ΣT(i) ≤ 2n, so average = O(2n/m)',
    ],
    limitation: 'Recurrence relations are most powerful for recursive divide-and-conquer algorithms (Merge Sort: T(n) = 2T(n/2) + O(n)). For iterative scans, sigma notation is more natural.',
    daaLink: 'Related AOA topics: Master Theorem, Merge Sort T(n)=2T(n/2)+n, Binary Search T(n)=T(n/2)+1.',
  },
];

const RADAR_AXES = [
  { key: 'speed',      label: 'Speed' },
  { key: 'space',      label: 'Space Eff.' },
  { key: 'fragResist', label: 'Frag Resist.' },
  { key: 'simplicity', label: 'Simplicity' },
  { key: 'fairness',   label: 'Fairness' },
];

const radarData = RADAR_AXES.map(a => ({
  subject: a.label,
  'First Fit':  ALGO_COMPLEXITY.find(x => x.algo === 'First Fit').radarData[a.key],
  'Best Fit':   ALGO_COMPLEXITY.find(x => x.algo === 'Best Fit').radarData[a.key],
  'Worst Fit':  ALGO_COMPLEXITY.find(x => x.algo === 'Worst Fit').radarData[a.key],
  'Next Fit':   ALGO_COMPLEXITY.find(x => x.algo === 'Next Fit').radarData[a.key],
}));

const caseBarData = ALGO_COMPLEXITY.map(a => ({
  name: a.algo.replace(' Fit', ''),
  'Best Case (Ω)':    a.algo === 'Best Fit' || a.algo === 'Worst Fit' ? 32 : 1,
  'Avg Case (Θ)':     a.algo === 'Best Fit' || a.algo === 'Worst Fit' ? 32 : 16,
  'Worst Case (O)':   32,
}));

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotationCard({ def }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="cursor-pointer select-none"
      onClick={() => setFlipped(v => !v)}
      title="Click to flip"
    >
      {!flipped ? (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800 transition-all">
          <div className={`text-2xl font-black font-mono mb-2 ${def.color}`}>{def.symbol}</div>
          <div className="text-xs font-bold text-slate-200 mb-1">{def.name}</div>
          <div className="text-[10px] text-slate-500 font-mono bg-slate-900 rounded px-2 py-1">{def.formal}</div>
          <div className="text-[10px] text-slate-500 mt-2 italic">Click for intuition ↑</div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-600 rounded-xl p-4 transition-all">
          <div className={`text-base font-bold mb-2 ${def.color}`}>{def.name}</div>
          <p className="text-xs text-slate-300 leading-relaxed">{def.meaning}</p>
          <div className="text-[10px] text-slate-500 mt-2 italic">Click to flip back ↑</div>
        </div>
      )}
    </div>
  );
}

function ParadigmCard({ p }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border ${p.color} overflow-hidden`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-bold text-sm">
          <span>{p.icon}</span>
          <span className={p.titleColor}>{p.name}</span>
        </span>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/40">
          <p className="text-xs text-slate-300 leading-relaxed mt-3">{p.desc}</p>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Examples in this Simulator</div>
            <ul className="space-y-1">
              {p.examples.map((e, i) => (
                <li key={i} className="text-[11px] text-slate-300 flex gap-1.5">
                  <span className="text-slate-500 mt-px">▸</span>{e}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-3">
            <div className="text-[10px] text-yellow-400 font-semibold mb-1">⚠ Limitation</div>
            <p className="text-[11px] text-slate-400">{p.limitation}</p>
          </div>
          <div className="bg-slate-800/40 rounded-lg px-3 py-2">
            <span className="text-[10px] text-purple-400 font-semibold">🔗 AOA Link: </span>
            <span className="text-[10px] text-slate-400">{p.daaLink}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltipSimple({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs shadow-2xl">
      <p className="text-slate-400 mb-2 font-bold">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.fill }}>{p.dataKey}</span>
          <span className="font-bold text-white">{p.value} slots</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function DAAPanel({ algos, chartData }) {
  const [activeSection, setActiveSection] = useState('cases');

  const sections = [
    { id: 'cases',      label: '📊 Case Analysis' },
    { id: 'paradigms',  label: '⚡ Algorithm Paradigms' },
    { id: 'radar',      label: '🕸 Performance Radar' },
  ];

  const totalAllocOps = chartData.filter(d => d.name?.startsWith('Alloc')).length;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/30 border border-purple-500/20 rounded-2xl p-5">
        <h2 className="text-lg font-black text-white mb-1">
          Analysis of Algorithms — <span className="text-purple-400">AOA</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          This panel maps every memory allocation algorithm to its formal AOA classification:
          algorithm paradigm, case analysis, amortised cost, and lower-bound theory.
          Simulation data (current run) is cross-referenced against theoretical predictions.
        </p>

        {/* Live proof banner */}
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.keys(algos).map(key => {
            const a = algos[key];
            const avgScans = totalAllocOps > 0 ? (a.totalScans / totalAllocOps).toFixed(1) : '—';
            const theoretical = key === 'best' || key === 'worst' ? '32.0' : '~16.0';
            const hex = { first:'#3b82f6', best:'#10b981', worst:'#ef4444', next:'#f97316' }[key];
            const name = { first:'First Fit', best:'Best Fit', worst:'Worst Fit', next:'Next Fit' }[key];
            return (
              <div key={key} className="bg-slate-900/60 rounded-xl p-3 text-center border border-slate-800">
                <div className="text-[10px] font-bold mb-1" style={{ color: hex }}>{name}</div>
                <div className="text-lg font-black text-white">{avgScans}</div>
                <div className="text-[9px] text-slate-500">avg scans/alloc</div>
                <div className="text-[9px] text-slate-600 mt-0.5">theory: {theoretical}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border
              ${activeSection === s.id
                ? 'bg-purple-600/25 border-purple-500/40 text-purple-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            {s.label}
          </button>
        ))}
      </div>


      {/* ── Section: Case Analysis ───────────────────────────────────────────── */}
      {activeSection === 'cases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ALGO_COMPLEXITY.map(a => (
              <div key={a.algo} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.hex }} />
                  <span className="font-bold text-sm text-slate-200">{a.algo}</span>
                  <span className="ml-auto text-[10px] text-slate-500 font-mono">{a.paradigm}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-2">
                    <div className="text-emerald-400 font-bold font-mono text-sm">{a.best}</div>
                    <div className="text-slate-400 mt-0.5">Best Case &nbsp;Ω</div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-2">
                    <div className="text-blue-400 font-bold font-mono text-sm">{a.avg}</div>
                    <div className="text-slate-400 mt-0.5">Average &nbsp;Θ</div>
                  </div>
                  <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-2">
                    <div className="text-red-400 font-bold font-mono text-sm">{a.worst}</div>
                    <div className="text-slate-400 mt-0.5">Worst Case &nbsp;O</div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-[11px] text-slate-400 leading-relaxed">
                  {a.caseNote}
                </div>

                {/* Live verification */}
                {algos[a.algo.toLowerCase().replace(' ', '')] && (() => {
                  const key = a.algo === 'First Fit' ? 'first' : a.algo === 'Best Fit' ? 'best' : a.algo === 'Worst Fit' ? 'worst' : 'next';
                  const live = algos[key];
                  return (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-500">Live avg scans this run:</span>
                      <span className="font-bold font-mono text-white">
                        {totalAllocOps > 0 ? (live.totalScans / totalAllocOps).toFixed(1) : '—'}
                      </span>
                      <span className="text-slate-600">/ 32 slots &nbsp;(n={32})</span>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Bar chart: theoretical slots scanned */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-4">
              Theoretical Scans per Case (n = 32 slots)
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={caseBarData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 35]} />
                  <Tooltip content={<CustomTooltipSimple />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="Best Case (Ω)"  fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Avg Case (Θ)"   fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Worst Case (O)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              Best Fit and Worst Fit have identical bars — they are Θ(n) in all cases.
              First Fit and Next Fit can terminate early.
            </p>
          </div>
        </div>
      )}

      {/* ── Section: Algorithm Paradigms ────────────────────────────────────── */}
      {activeSection === 'paradigms' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 bg-slate-900/60 rounded-xl p-3 border border-slate-800">
            AOA classifies algorithms by <strong className="text-white">design paradigm</strong> — the strategic approach to problem-solving.
            Each paradigm has known tradeoffs between correctness, optimality, and efficiency. Memory allocation algorithms span three major paradigms.
          </p>
          {PARADIGMS.map(p => <ParadigmCard key={p.name} p={p} />)}
        </div>
      )}

      {/* ── Section: Radar Chart ─────────────────────────────────────────────── */}
      {activeSection === 'radar' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-200 mb-1">Multi-Dimensional Algorithm Comparison</h3>
            <p className="text-[11px] text-slate-500 mb-4">Radar plot of 5 qualitative AOA dimensions (higher = better). Based on theoretical properties, not live data.</p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 10, right: 40, left: 40, bottom: 10 }}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                  <Radar name="First Fit"  dataKey="First Fit"  stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Best Fit"   dataKey="Best Fit"   stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Worst Fit"  dataKey="Worst Fit"  stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="Next Fit"   dataKey="Next Fit"   stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { axis: 'Speed',        desc: 'How early the algorithm can terminate. First/Next Fit win (early exit). Best/Worst always scan full array.' },
              { axis: 'Space Eff.',   desc: 'Quality of memory space utilisation. Best Fit wastes least per individual allocation; Worst Fit leaves dangerous remnants.' },
              { axis: 'Frag Resist.', desc: 'Resistance to external fragmentation over time. Best Fit reduces per-alloc waste but creates tiny holes. First Fit clusters.' },
              { axis: 'Simplicity',   desc: 'Ease of implementation and reasoning. All are simple linear scans; Next Fit adds pointer state complexity.' },
              { axis: 'Fairness',     desc: 'How evenly memory is distributed across addresses. Next Fit distributes most uniformly; First Fit clusters at low addresses.' },
            ].map(x => (
              <div key={x.axis} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-200 mb-1">{x.axis}</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{x.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}
