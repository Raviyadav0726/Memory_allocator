import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * FragmentationDashboard
 * Displays real-time external fragmentation, internal fragmentation,
 * largest contiguous block, and a colour-coded frag-ratio bar.
 */
export function FragmentationDashboard({ algos, internalFragByAlgo }) {
  const algoKeys = Object.keys(algos);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-yellow-400" />
        Fragmentation Metrics Dashboard
      </h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {algoKeys.map(key => {
          const { totalFree, largestBlock, externalFrag, fragRatio, numHoles } = algos[key].fragStats;
          const intFrag = internalFragByAlgo[key] || 0;
          const pct = Math.round(fragRatio * 100);

          const barColor = pct < 30
            ? 'from-emerald-500 to-emerald-400'
            : pct < 60
            ? 'from-yellow-500 to-yellow-400'
            : 'from-red-500 to-red-400';

          const hexColors = { first: '#3b82f6', best: '#10b981', worst: '#ef4444', next: '#f97316' };

          return (
            <div key={key} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50 space-y-3">
              {/* Header */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: hexColors[key] }}
                />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  {{ first: 'First Fit', best: 'Best Fit', worst: 'Worst Fit', next: 'Next Fit' }[key]}
                </span>
              </div>

              {/* External frag bar */}
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400">Ext. Fragmentation</span>
                  <span className="text-slate-200 font-bold">{pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Metric grid */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <Metric label="Total Free" value={`${totalFree} slots`} />
                <Metric label="Largest Block" value={`${largestBlock} slots`} highlight />
                <Metric label="Ext. Frag" value={`${externalFrag} slots`} warn={externalFrag > 4} />
                <Metric label="Free Holes" value={numHoles} warn={numHoles > 3} />
              </div>

              {/* Internal fragmentation */}
              <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">Int. Frag (power-of-2 rounding)</span>
                  <span className={`font-bold ${intFrag > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {intFrag > 0 ? `+${intFrag} wasted` : '0'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value, highlight, warn }) {
  return (
    <div className="bg-slate-900/60 rounded-lg p-2 text-center">
      <div className="text-slate-500 mb-0.5">{label}</div>
      <div className={`font-bold ${highlight ? 'text-blue-400' : warn ? 'text-yellow-400' : 'text-slate-200'}`}>
        {value}
      </div>
    </div>
  );
}
