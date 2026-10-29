import React from 'react';
import { Cpu } from 'lucide-react';

const PRIORITY_STYLE = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  normal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low:    'bg-slate-600/40 text-slate-400 border-slate-600/30',
};

export function RequestQueue({ requests, currentReqIndex }) {
  return (
    <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 shadow-inner flex flex-col flex-1 min-h-[220px] max-h-[380px]">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 flex-shrink-0">
        <Cpu size={13} /> Request Queue
      </h3>

      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
        {requests.map((req, idx) => {
          if (idx < currentReqIndex - 2) return null; // show last 2 processed + upcoming
          const isCurrent = idx === currentReqIndex;
          const isPast = idx < currentReqIndex;

          return (
            <div
              key={req.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs transition-all
                ${isCurrent
                  ? 'bg-slate-700/90 border-slate-400 shadow-md'
                  : isPast
                  ? 'opacity-35 border-transparent bg-slate-900/40'
                  : 'bg-slate-900/70 border-slate-700/40'}`}
            >
              {/* Step number */}
              <span className="w-4 text-slate-500 font-mono text-[10px] text-right flex-shrink-0">{idx + 1}</span>

              {/* Type badge */}
              {req.type === 'alloc' ? (
                <span className="px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase bg-blue-500/20 text-blue-400 border-blue-500/30 flex-shrink-0">
                  Alloc
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase bg-red-500/20 text-red-400 border-red-500/30 flex-shrink-0">
                  Free
                </span>
              )}

              {/* Process ID */}
              <span className={`font-bold ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                {req.processId}
              </span>

              {/* Size */}
              {req.type === 'alloc' && (
                <span className="text-slate-400">{req.size}×</span>
              )}

              {/* Priority */}
              {req.priority && (
                <span className={`ml-auto px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${PRIORITY_STYLE[req.priority] || PRIORITY_STYLE.normal}`}>
                  {req.priority}
                </span>
              )}
            </div>
          );
        })}

        {currentReqIndex >= requests.length && (
          <div className="text-emerald-400 font-medium text-center py-4 text-xs">
            ✓ All requests completed
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700/60 text-center flex-shrink-0">
        Step {Math.min(currentReqIndex, requests.length)} / {requests.length}
      </div>
    </div>
  );
}
