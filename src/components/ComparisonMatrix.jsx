import React from 'react';
import { Trophy } from 'lucide-react';

const HEX = { first: '#3b82f6', best: '#10b981', worst: '#ef4444', next: '#f97316' };
const NAMES = { first: 'First Fit', best: 'Best Fit', worst: 'Worst Fit', next: 'Next Fit' };

function ScoreBar({ label, value, maxValue, color }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-bold">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const MEDAL = ['🥇', '🥈', '🥉', ''];

export function ComparisonMatrix({ algos }) {
  const keys = Object.keys(algos);
  const maxHoused = Math.max(...keys.map(k => algos[k].appsHoused), 1);
  const maxScans  = Math.max(...keys.map(k => algos[k].totalScans), 1);
  const maxFrag   = Math.max(...keys.map(k => algos[k].fragStats?.externalFrag ?? 0), 1);

  const sorted = [...keys].sort((a, b) => {
    // rank: most housed first, then fewest scans as tiebreaker
    if (algos[b].appsHoused !== algos[a].appsHoused)
      return algos[b].appsHoused - algos[a].appsHoused;
    return algos[a].totalScans - algos[b].totalScans;
  });

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-yellow-400" />
        Side-by-Side Comparison Matrix
      </h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {sorted.map((key, rank) => {
          const a = algos[key];
          const costScore = maxScans > 0 ? Math.round((1 - a.totalScans / maxScans) * 100) : 0;

          return (
            <div
              key={key}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 space-y-3 relative overflow-hidden"
            >
              {/* Rank badge */}
              <div className="absolute top-3 right-3 text-lg">{MEDAL[rank] || ''}</div>

              {/* Header */}
              <div className="flex items-center gap-2 pr-8">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: HEX[key] }} />
                <span className="text-sm font-bold text-slate-200">{NAMES[key]}</span>
              </div>

              {/* Bars */}
              <div className="space-y-2">
                <ScoreBar label="Apps Housed" value={a.appsHoused} maxValue={maxHoused} color={HEX[key]} />
                <ScoreBar label="Scan Cost (↓=better)" value={a.totalScans} maxValue={maxScans} color="#64748b" />
                <ScoreBar label="Ext. Fragmentation" value={a.fragStats?.externalFrag ?? 0} maxValue={maxFrag} color="#f59e0b" />
              </div>

              {/* Efficiency score */}
              <div className="pt-2 border-t border-slate-700/50 text-center">
                <div className="text-[10px] text-slate-400 mb-0.5">Efficiency Score</div>
                <div className="text-xl font-black" style={{ color: HEX[key] }}>{costScore}</div>
                <div className="text-[9px] text-slate-500">(scan efficiency vs. best)</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
