import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, StepForward, RotateCcw, Activity,
  Zap, BookOpen, BarChart3, FlaskConical, SkipForward, Sigma,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

import {
  calculateFirstFit, calculateBestFit, calculateWorstFit, calculateNextFit,
  countWastedGaps, calcFragmentation, SCENARIOS,
} from './utils/algorithms';
import { TradeoffPanel }          from './components/TradeoffPanel';
import { FragmentationDashboard } from './components/FragmentationDashboard';
import { ComparisonMatrix }       from './components/ComparisonMatrix';
import { RequestQueue }           from './components/RequestQueue';
import { CustomQueueBuilder }     from './components/CustomQueueBuilder';
import { DAAPanel }               from './components/DAAPanel';

// ─── Constants ────────────────────────────────────────────────────────────────
const MEMORY_SIZE = 32;

const THEME = {
  first: { name: 'First Fit', hex: '#3b82f6', desc: 'Stops at the very first suitable gap.' },
  best:  { name: 'Best Fit',  hex: '#10b981', desc: 'Full sweep to find the tightest gap.' },
  worst: { name: 'Worst Fit', hex: '#ef4444', desc: 'Full sweep to find the largest gap.' },
  next:  { name: 'Next Fit',  hex: '#f97316', desc: 'Resumes from last pointer (circular).' },
};

const getTextColor  = k => ({ first:'text-blue-400', best:'text-emerald-400', worst:'text-red-400', next:'text-orange-400' }[k]);
const getBorderColor = k => ({ first:'border-blue-500/25', best:'border-emerald-500/25', worst:'border-red-500/25', next:'border-orange-500/25' }[k]);

// ─── Initial state factories ──────────────────────────────────────────────────
const emptyAlgoState = () => ({
  memory:          Array(MEMORY_SIZE).fill(null),
  appsHoused:      0,
  failedAllocs:    0,
  wastedGaps:      1,
  totalScans:      0,
  totalIntFrag:    0,
  nextFitPointer:  0,
  lastCostNote:    '',
  fragStats:       { totalFree: MEMORY_SIZE, largestBlock: MEMORY_SIZE, externalFrag: 0, fragRatio: 0, numHoles: 1 },
});

const createInitialAlgos = () => ({
  first: emptyAlgoState(),
  best:  emptyAlgoState(),
  worst: emptyAlgoState(),
  next:  emptyAlgoState(),
});

// ─── Slot colour helpers ──────────────────────────────────────────────────────
const COLOR_MAP = {
  first: { r: 59,  g: 130, b: 246 },
  best:  { r: 16,  g: 185, b: 129 },
  worst: { r: 239, g: 68,  b: 68  },
  next:  { r: 249, g: 115, b: 22  },
};

function slotStyle(algoKey, memVal, i, phase, pendingUpdates) {
  const isScanning   = phase === 'scanning'   && pendingUpdates?.[algoKey]?.scannedSlots?.includes(i);
  const isCommitting = phase === 'committing' && pendingUpdates?.[algoKey]?.finalizedSlots?.includes(i);
  const isFailing    = phase === 'committing' && pendingUpdates?.[algoKey]?.failed;

  if (isScanning)   return { backgroundColor: 'rgba(250,204,21,0.85)', boxShadow: '0 0 8px rgba(250,204,21,0.5)' };
  if (isCommitting) {
    if (isFailing)  return { backgroundColor: 'rgba(239,68,68,0.5)', boxShadow: '0 0 10px rgba(239,68,68,0.4)' };
    return { backgroundColor: 'rgba(52,211,153,0.9)', boxShadow: '0 0 12px rgba(52,211,153,0.7)', transform: 'scaleY(1.08)' };
  }
  if (!memVal) return {};

  const pId = parseInt(memVal.replace('P', ''), 10);
  const opacities = [1, 0.75, 0.6, 0.5, 0.85];
  const opacity = opacities[pId % opacities.length];
  const { r, g, b } = COLOR_MAP[algoKey];
  return { backgroundColor: `rgba(${r},${g},${b},${opacity})` };
}

function slotBaseClass(memVal) {
  const base = 'flex-1 h-10 rounded-[3px] border border-slate-950 transition-all duration-200 relative overflow-hidden ';
  return base + (memVal ? '' : 'bg-slate-800/80');
}

// ─── Custom Tooltip for Recharts ──────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-slate-400 mb-2 font-mono">Step {label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-bold text-white">{p.value} scans</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [scenario, setScenario]               = useState('default');
  const [algos, setAlgos]                     = useState(createInitialAlgos());
  const [currentReqIndex, setCurrentReqIndex] = useState(0);
  const [isPlaying, setIsPlaying]             = useState(false);
  const [speedMs, setSpeedMs]                 = useState(700);
  const [skipFrames, setSkipFrames]           = useState(false);
  const [phase, setPhase]                     = useState('idle');
  const [pendingUpdates, setPendingUpdates]   = useState(null);
  const [chartData, setChartData]             = useState([
    { step: 0, name: 'Start', first: 0, best: 0, worst: 0, next: 0 },
  ]);
  const [internalFragByAlgo, setInternalFragByAlgo] = useState({
    first: 0, best: 0, worst: 0, next: 0,
  });
  const [activeTab, setActiveTab] = useState('memory'); // memory | analytics

  // ─── Custom queue state ────────────────────────────────────────────────────
  const [customRequests, setCustomRequests] = useState([]);
  const [useCustomQueue, setUseCustomQueue] = useState(false);

  // Active requests: custom (when toggled + non-empty) or scenario default
  const requests = useCustomQueue && customRequests.length > 0
    ? customRequests
    : SCENARIOS[scenario].requests;

  // ─── Step start ─────────────────────────────────────────────────────────────
  const handleStepStart = useCallback(() => {
    if (phase !== 'idle' || currentReqIndex >= requests.length) return;
    const req = requests[currentReqIndex];

    const nextUpdates = {};
    Object.keys(algos).forEach(key => {
      const { memory, nextFitPointer } = algos[key];
      if (req.type === 'alloc') {
        let res;
        if (key === 'first') res = calculateFirstFit(memory, req.size);
        else if (key === 'best')  res = calculateBestFit(memory, req.size);
        else if (key === 'worst') res = calculateWorstFit(memory, req.size);
        else                      res = calculateNextFit(memory, req.size, nextFitPointer);

        nextUpdates[key] = {
          scannedSlots:   res.scanned,
          finalizedSlots: res.chosen,
          totalScansDelta: res.totalScans,
          newPointer:     res.newPointer ?? nextFitPointer,
          internalFrag:   res.internalFrag ?? 0,
          costNote:       res.costExplanation ?? '',
          failed:         !res.success,
        };
      } else {
        const freedSlots = memory.reduce((acc, v, i) => { if (v === req.processId) acc.push(i); return acc; }, []);
        nextUpdates[key] = {
          scannedSlots:    [],
          finalizedSlots:  freedSlots,
          totalScansDelta: 0,
          newPointer:      nextFitPointer,
          internalFrag:    0,
          costNote:        `Freeing ${freedSlots.length} slots held by ${req.processId}.`,
          failed:          false,
        };
      }
    });

    setPendingUpdates(nextUpdates);
    if (req.type === 'alloc' && !skipFrames) setPhase('scanning');
    else setPhase('committing');
  }, [phase, currentReqIndex, requests, algos, skipFrames]);

  // ─── Apply committed state ───────────────────────────────────────────────────
  const applyUpdates = useCallback(() => {
    if (!pendingUpdates) return;
    const req = requests[currentReqIndex];
    const newPoint = {
      step: currentReqIndex + 1,
      name: req.type === 'alloc' ? `Alloc ${req.processId}` : `Free ${req.processId}`,
    };

    setAlgos(prev => {
      const next = { ...prev };
      const newIntFrag = { ...internalFragByAlgo };

      Object.keys(next).forEach(key => {
        const upd = pendingUpdates[key] ?? { finalizedSlots: [], totalScansDelta: 0, newPointer: next[key].nextFitPointer };
        const mem = [...next[key].memory];
        let housedDelta = 0;
        let failedDelta = 0;

        if (req.type === 'alloc') {
          if (!upd.failed && upd.finalizedSlots.length === req.size) {
            upd.finalizedSlots.forEach(i => mem[i] = req.processId);
            housedDelta = 1;
            newIntFrag[key] = (newIntFrag[key] || 0) + (upd.internalFrag || 0);
          } else {
            failedDelta = 1;
          }
        } else {
          upd.finalizedSlots.forEach(i => mem[i] = null);
        }

        const fragStats = calcFragmentation(mem);
        next[key] = {
          ...next[key],
          memory:         mem,
          appsHoused:     next[key].appsHoused + housedDelta,
          failedAllocs:   next[key].failedAllocs + failedDelta,
          wastedGaps:     countWastedGaps(mem),
          totalScans:     next[key].totalScans + (upd.totalScansDelta || 0),
          totalIntFrag:   (next[key].totalIntFrag || 0) + (upd.internalFrag || 0),
          nextFitPointer: upd.newPointer,
          lastCostNote:   upd.costNote || '',
          fragStats,
        };
        newPoint[key] = next[key].totalScans;
      });

      setInternalFragByAlgo(newIntFrag);
      return next;
    });

    setChartData(prev => [...prev, newPoint]);
    setCurrentReqIndex(i => i + 1);
  }, [pendingUpdates, currentReqIndex, requests, internalFragByAlgo]);

  // ─── Phase clock ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'idle' && isPlaying) {
      if (currentReqIndex < requests.length) {
        const t = setTimeout(handleStepStart, speedMs * 0.15);
        return () => clearTimeout(t);
      } else {
        setIsPlaying(false);
      }
    }
    if (phase === 'scanning') {
      const t = setTimeout(() => setPhase('committing'), skipFrames ? 0 : speedMs * 0.35);
      return () => clearTimeout(t);
    }
    if (phase === 'committing') {
      const t = setTimeout(() => { applyUpdates(); setPhase('idle'); }, skipFrames ? 0 : speedMs * 0.35);
      return () => clearTimeout(t);
    }
  }, [phase, isPlaying, currentReqIndex, speedMs, skipFrames, requests.length]);

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setIsPlaying(false);
    setPhase('idle');
    setAlgos(createInitialAlgos());
    setCurrentReqIndex(0);
    setPendingUpdates(null);
    setChartData([{ step: 0, name: 'Start', first: 0, best: 0, worst: 0, next: 0 }]);
    setInternalFragByAlgo({ first: 0, best: 0, worst: 0, next: 0 });
  };

  const handleScenarioChange = (s) => {
    setScenario(s);
    setUseCustomQueue(false);
    handleReset();
  };

  const handleToggleCustomQueue = () => {
    setUseCustomQueue(v => !v);
    handleReset();
  };

  const done = currentReqIndex >= requests.length;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col gap-4 p-5 shadow-2xl z-20 overflow-y-auto">

        {/* Brand */}
        <div>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-br from-blue-400 via-emerald-400 to-orange-400 bg-clip-text text-transparent">
            Memory Allocator
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">OS Simulation Platform v2.0</p>
        </div>

        {/* Scenario picker */}
        <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700 space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical size={12} /> Scenario
          </label>
          {Object.entries(SCENARIOS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => handleScenarioChange(key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border
                ${scenario === key
                  ? 'bg-slate-700 border-slate-500 text-white font-semibold'
                  : 'bg-slate-900/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <div className="font-medium">{s.label}</div>
              <div className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{s.description}</div>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(v => !v)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${isPlaying
                ? 'bg-red-500/20 text-red-400 border border-red-500/25 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/30'}`}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleStepStart}
            disabled={isPlaying || done || phase !== 'idle'}
            className="flex items-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold border border-slate-700 disabled:opacity-40 transition-all"
          >
            <StepForward size={15} />
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition-all"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Speed slider */}
        <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700 space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between">
            Simulation Speed
            <span className="text-emerald-400 font-mono">{speedMs}ms</span>
          </label>
          <input
            type="range" min="100" max="2000" step="50"
            value={speedMs}
            onChange={e => setSpeedMs(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipFrames}
              onChange={() => setSkipFrames(v => !v)}
              className="accent-orange-500"
            />
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <SkipForward size={11} /> Skip animation frames
            </span>
          </label>
        </div>

        {/* Custom queue builder */}
        <CustomQueueBuilder
          customRequests={customRequests}
          setCustomRequests={setCustomRequests}
          onActivate={handleToggleCustomQueue}
          isActive={useCustomQueue}
        />

        {/* Request queue */}
        <RequestQueue requests={requests} currentReqIndex={currentReqIndex} />

        {/* Progress */}
        <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Progress</span>
            <span className="text-slate-200 font-mono">{Math.min(currentReqIndex, requests.length)}/{requests.length}</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${(Math.min(currentReqIndex, requests.length) / requests.length) * 100}%` }}
            />
          </div>
          {done && <div className="text-emerald-400 text-center font-semibold pt-1">✓ Simulation Complete</div>}
        </div>

      </aside>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-0 flex-shrink-0">
          {[
            { id: 'memory',    icon: <Activity size={13} />,   label: 'Memory View'   },
            { id: 'analytics', icon: <BarChart3 size={13} />,  label: 'Analytics'     },
            { id: 'daa',       icon: <Sigma size={13} />,      label: 'AOA'           },
            { id: 'learn',     icon: <BookOpen size={13} />,   label: 'Learn'         },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-xs font-semibold transition-all border-b-2 
                ${activeTab === tab.id
                  ? 'text-white bg-slate-800/60 border-blue-500'
                  : 'text-slate-400 bg-transparent border-transparent hover:text-slate-200 hover:bg-slate-800/30'}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">

          {/* ── MEMORY TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'memory' && (
            <>
              {/* Fragmentation dashboard */}
              <FragmentationDashboard algos={algos} internalFragByAlgo={internalFragByAlgo} />

              {/* Algorithm cards */}
              <div className="grid grid-cols-1 gap-4">
                {Object.keys(algos).map(key => {
                  const algo = algos[key];
                  const theme = THEME[key];
                  const isNextFit = key === 'next';
                  const currentReq = requests[currentReqIndex];

                  return (
                    <div
                      key={key}
                      className={`bg-slate-900/80 rounded-2xl border ${getBorderColor(key)} p-5 shadow-lg`}
                    >
                      {/* Card header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className={`text-lg font-bold ${getTextColor(key)}`}>{theme.name}</h2>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-purple-400 font-mono">O(N)</span>
                            {key === 'best' || key === 'worst'
                              ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">Full sweep always</span>
                              : null}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{theme.desc}</p>
                        </div>

                        {/* Stat pills */}
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <Pill label="Housed" value={algo.appsHoused} />
                          <Pill label="Failed" value={algo.failedAllocs} warn={algo.failedAllocs > 0} />
                          <Pill label="Gaps" value={algo.wastedGaps} />
                          <Pill label="Scans" value={algo.totalScans} />
                          {algo.totalIntFrag > 0 && <Pill label="Int. Frag" value={`${algo.totalIntFrag}sl`} warn />}
                        </div>
                      </div>

                      {/* Memory strip */}
                      <div className="flex gap-[2px] bg-slate-950 p-2 rounded-xl border border-slate-800 relative overflow-hidden">
                        {/* Next Fit pointer marker */}
                        {isNextFit && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-orange-400/60 z-20 transition-all duration-300"
                            style={{ left: `calc(8px + ${algo.nextFitPointer} * (calc(100% - 20px) / ${MEMORY_SIZE}))` }}
                          />
                        )}

                        {algo.memory.map((memVal, i) => (
                          <div
                            key={i}
                            className={slotBaseClass(memVal)}
                            style={slotStyle(key, memVal, i, phase, pendingUpdates)}
                            title={memVal ? `Slot ${i}: ${memVal}` : `Slot ${i}: free`}
                          >
                            {memVal && (
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">
                                {memVal}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Cost note */}
                      {algo.lastCostNote && (
                        <div className="mt-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 text-[10px] text-slate-400 flex items-start gap-1.5">
                          <Zap size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                          {algo.lastCostNote}
                        </div>
                      )}

                      {isNextFit && (
                        <div className="text-[10px] text-orange-400/60 mt-1 text-right">
                          Pointer @ slot {algo.nextFitPointer}
                        </div>
                      )}

                      {/* Tradeoff Panel */}
                      <TradeoffPanel algoKey={key} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── ANALYTICS TAB ──────────────────────────────────────────────── */}
          {activeTab === 'analytics' && (
            <>
              <ComparisonMatrix algos={algos} />

              {/* Line chart */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-blue-400" />
                  Cumulative Scan Overhead (O(N) Comparison)
                </h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="step" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                        formatter={v => <span style={{ color: '#cbd5e1' }}>{v}</span>}
                      />
                      {Object.keys(THEME).map(key => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={THEME[key].name}
                          stroke={THEME[key].hex}
                          strokeWidth={2.5}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Best Fit and Worst Fit lines often overlap — both always scan all N slots. First Fit and Next Fit terminate early.
                </p>
              </div>

              {/* Algorithmic cost notes if done */}
              {done && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-400" />
                    Post-Run Cost Analysis
                  </h2>
                  {Object.keys(algos).map(key => {
                    const a = algos[key];
                    const efficiency = a.appsHoused / Math.max(1, requests.filter(r => r.type === 'alloc').length);
                    return (
                      <div key={key} className={`p-4 rounded-xl border ${getBorderColor(key)} bg-slate-800/30`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: THEME[key].hex }} />
                          <span className={`font-bold text-sm ${getTextColor(key)}`}>{THEME[key].name}</span>
                          <span className="ml-auto text-xs text-slate-400 font-mono">{a.totalScans} total scans</span>
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          <p>📊 Placed <strong className="text-white">{a.appsHoused}</strong> of {requests.filter(r=>r.type==='alloc').length} alloc requests ({Math.round(efficiency*100)}% success rate)</p>
                          <p>🔍 Average scans per alloc: <strong className="text-white">{(a.totalScans / Math.max(1, requests.filter(r=>r.type==='alloc').length)).toFixed(1)}</strong></p>
                          <p>🧩 External fragmentation on exit: <strong className="text-yellow-400">{a.fragStats?.externalFrag ?? 0} slots</strong> unusable across {a.fragStats?.numHoles ?? 0} holes</p>
                          {a.totalIntFrag > 0 && <p>⚠️ Internal fragmentation (power-of-2 rounding): <strong className="text-orange-400">{a.totalIntFrag} wasted slots</strong></p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── DAA / AOA TAB ───────────────────────────────────────────── */}
          {activeTab === 'daa' && (
            <DAAPanel algos={algos} chartData={chartData} />
          )}

          {/* ── LEARN TAB ──────────────────────────────────────────────────── */}
          {activeTab === 'learn' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <LearnCard
                title="What is Memory Allocation?"
                color="blue"
                body="When a process requests RAM, the OS must find a contiguous block of free physical frames. The strategy used is the memory allocation algorithm. The choice has significant impact on throughput, fragmentation, and system longevity."
              />
              <LearnCard
                title="External vs. Internal Fragmentation"
                color="yellow"
                body={<>
                  <p><strong className="text-yellow-300">External Fragmentation:</strong> Total free memory exists, but it's scattered in non-contiguous chunks — no single large-enough block exists. Formula: <code className="bg-slate-800 px-1 rounded text-yellow-400">Total Free − Largest Block</code>.</p>
                  <p className="mt-2"><strong className="text-orange-300">Internal Fragmentation:</strong> Memory is allocated in fixed-size chunks (power-of-2 pages). A 5-slot request gets 8 slots allocated — 3 are wasted internally, invisible to other processes.</p>
                </>}
              />
              <LearnCard
                title="Why O(N) Still Matters"
                color="purple"
                body="All four algorithms share O(N) worst-case complexity — they scan the memory array linearly. But N here is the physical frame count (32 in this sim, but hundreds of thousands in a real OS). Best Fit and Worst Fit always pay the full O(N) cost. First Fit and Next Fit terminate on first success, making them typically faster in practice."
              />
              <LearnCard
                title="The Death Spiral (Try It!)"
                color="red"
                body="Select the '💀 Death Spiral' scenario. Watch how alternating small (1-slot) and large (5-slot) allocations, followed by freeing only the large ones, creates a 'checker-board' of tiny 5-slot holes. When a 4-slot request arrives, Best Fit fails to place it despite having 15+ total free slots — because the largest contiguous block is only 5 slots, split by 1-slot barriers."
              />
              <LearnCard
                title="Process Priority & Scheduling"
                color="emerald"
                body="Real OS kernels don't treat all processes equally. High-priority processes (kernel services, real-time tasks) may pre-empt memory from low-priority ones. In this simulator, priority metadata is tracked per request — in a full kernel implementation, this would influence the scheduler's decision to evict pages under memory pressure."
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── Small helper components ───────────────────────────────────────────────────
function Pill({ label, value, warn, highlight }) {
  return (
    <div className={`px-2 py-1 rounded-md border flex gap-1.5 items-center
      ${warn      ? 'bg-red-900/20 border-red-500/20 text-red-300'
      : highlight ? 'bg-blue-900/20 border-blue-500/20 text-blue-300'
      : 'bg-slate-800 border-slate-700 text-slate-300'}`}
    >
      <span className="text-slate-500 text-[10px]">{label}:</span>
      <span className="font-bold text-[11px]">{value}</span>
    </div>
  );
}

function LearnCard({ title, color, body }) {
  const borderMap = {
    blue: 'border-blue-500/30 bg-blue-900/10',
    yellow: 'border-yellow-500/30 bg-yellow-900/10',
    purple: 'border-purple-500/30 bg-purple-900/10',
    red: 'border-red-500/30 bg-red-900/10',
    emerald: 'border-emerald-500/30 bg-emerald-900/10',
  };
  const titleMap = {
    blue: 'text-blue-400', yellow: 'text-yellow-400', purple: 'text-purple-400',
    red: 'text-red-400', emerald: 'text-emerald-400',
  };
  return (
    <div className={`rounded-xl border p-5 ${borderMap[color]}`}>
      <h3 className={`font-bold text-sm mb-2 ${titleMap[color]}`}>{title}</h3>
      <div className="text-xs text-slate-300 leading-relaxed space-y-1">{body}</div>
    </div>
  );
}
