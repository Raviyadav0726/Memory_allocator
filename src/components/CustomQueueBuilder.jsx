import React, { useState } from 'react';
import { Plus, Trash2, ListPlus, X, CheckCircle } from 'lucide-react';

// All process IDs ever referenceable
const ALL_PIDS = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);

const PRIORITY_OPTIONS = ['high', 'normal', 'low'];
const PRIORITY_COLOR = {
  high:   'text-red-400 border-red-500/30 bg-red-500/10',
  normal: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  low:    'text-slate-400 border-slate-600/30 bg-slate-700/30',
};

export function CustomQueueBuilder({ customRequests, setCustomRequests, onActivate, isActive }) {
  const [form, setForm] = useState({ type: 'alloc', processId: 'P1', size: 4, priority: 'normal' });
  const [open, setOpen] = useState(false);

  // Which PIDs currently have alloc entries (and no free) → eligible for free
  const allocatedPids = (() => {
    const counts = {};
    customRequests.forEach(r => {
      if (r.type === 'alloc') counts[r.processId] = (counts[r.processId] || 0) + 1;
      if (r.type === 'free')  counts[r.processId] = (counts[r.processId] || 0) - 1;
    });
    return Object.keys(counts).filter(pid => counts[pid] > 0);
  })();

  const handleAdd = () => {
    if (form.type === 'alloc' && (form.size < 1 || form.size > 20)) return;
    if (form.type === 'free' && !allocatedPids.includes(form.processId)) return;

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const req = form.type === 'alloc'
      ? { id, type: 'alloc', pid: parseInt(form.processId.replace('P', '')), processId: form.processId, size: form.size, priority: form.priority }
      : { id, type: 'free',  pid: parseInt(form.processId.replace('P', '')), processId: form.processId };

    setCustomRequests(prev => [...prev, req]);

    // Advance PID for alloc convenience
    if (form.type === 'alloc') {
      const nextNum = parseInt(form.processId.replace('P', '')) + 1;
      setForm(f => ({ ...f, processId: `P${Math.min(nextNum, 20)}` }));
    }
  };

  const handleRemove = (id) => setCustomRequests(prev => prev.filter(r => r.id !== id));
  const handleClear  = () => setCustomRequests([]);

  // Auto-select a valid processId for free when switching type
  const handleTypeChange = (t) => {
    const nextPid = t === 'free'
      ? (allocatedPids[0] || form.processId)
      : form.processId;
    setForm(f => ({ ...f, type: t, processId: nextPid }));
  };

  return (
    <div className="bg-slate-800/70 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ListPlus size={13} />
          Custom Queue
          {customRequests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[10px] font-bold">
              {customRequests.length}
            </span>
          )}
        </span>
        <span className="text-slate-600">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-700 p-3 space-y-3">

          {/* Active toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-slate-400">Use custom queue</span>
            <button
              onClick={onActivate}
              className={`relative w-9 h-5 rounded-full transition-colors ${isActive ? 'bg-violet-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-4' : ''}`} />
            </button>
          </label>

          {isActive && (
            <div className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-1.5 flex gap-1.5 items-start">
              <CheckCircle size={10} className="mt-0.5 flex-shrink-0" />
              Custom queue active. Default scenario queue is bypassed.
            </div>
          )}

          {/* Form */}
          <div className="space-y-2">
            {/* Type */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {['alloc', 'free'].map(t => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(t)}
                  className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all
                    ${form.type === t
                      ? t === 'alloc' ? 'bg-blue-600/30 text-blue-400' : 'bg-red-600/30 text-red-400'
                      : 'bg-slate-900/60 text-slate-500 hover:text-slate-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Process ID */}
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Process ID</label>
              <select
                value={form.processId}
                onChange={e => setForm(f => ({ ...f, processId: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
              >
                {(form.type === 'free' ? allocatedPids : ALL_PIDS).map(pid => (
                  <option key={pid} value={pid}>{pid}</option>
                ))}
              </select>
              {form.type === 'free' && allocatedPids.length === 0 && (
                <p className="text-[10px] text-red-400 mt-1">No allocated processes to free yet.</p>
              )}
            </div>

            {/* Size (alloc only) */}
            {form.type === 'alloc' && (
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">
                  Size (slots) <span className="text-slate-600">1–20</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={1} max={20}
                    value={form.size}
                    onChange={e => setForm(f => ({ ...f, size: Math.max(1, Math.min(20, Number(e.target.value))) }))}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
                  />
                  <div className="flex gap-1">
                    {[2, 4, 6, 8].map(n => (
                      <button
                        key={n}
                        onClick={() => setForm(f => ({ ...f, size: n }))}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors
                          ${form.size === n ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Priority (alloc only) */}
            {form.type === 'alloc' && (
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Priority</label>
                <div className="flex gap-1.5">
                  {PRIORITY_OPTIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className={`flex-1 py-1 rounded-lg border text-[10px] font-semibold uppercase transition-all
                        ${form.priority === p ? PRIORITY_COLOR[p] : 'border-transparent bg-slate-900/60 text-slate-500 hover:text-slate-300'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add button */}
            <button
              onClick={handleAdd}
              disabled={form.type === 'free' && allocatedPids.length === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all"
            >
              <Plus size={13} /> Add to Queue
            </button>
          </div>

          {/* Built queue preview */}
          {customRequests.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide">Queue ({customRequests.length})</span>
                <button onClick={handleClear} className="text-[10px] text-red-400/70 hover:text-red-400 flex items-center gap-0.5">
                  <X size={10} /> Clear all
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-0.5">
                {customRequests.map((req, idx) => (
                  <div key={req.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/70 rounded-lg border border-slate-700/40 text-[10px]">
                    <span className="text-slate-600 w-4 text-right font-mono">{idx + 1}</span>
                    <span className={`px-1.5 rounded font-bold uppercase ${req.type === 'alloc' ? 'text-blue-400' : 'text-red-400'}`}>
                      {req.type}
                    </span>
                    <span className="text-slate-300 font-medium">{req.processId}</span>
                    {req.size && <span className="text-slate-500">{req.size}×</span>}
                    {req.priority && (
                      <span className={`ml-auto px-1 rounded border text-[9px] font-bold uppercase ${PRIORITY_COLOR[req.priority]}`}>
                        {req.priority}
                      </span>
                    )}
                    <button
                      onClick={() => handleRemove(req.id)}
                      className="ml-1 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
