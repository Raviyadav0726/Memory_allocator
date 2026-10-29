// ─── Pure Algorithm Functions ─────────────────────────────────────────────────
// All functions are side-effect free. They receive a snapshot of memory and
// return structured result objects. No React state is mutated here.

/**
 * Finds all contiguous free holes in the memory array.
 * Returns an array of { start, size } objects.
 */
export const findHoles = (memory) => {
  const holes = [];
  let start = -1;
  let size = 0;
  for (let i = 0; i <= memory.length; i++) {
    if (i < memory.length && memory[i] === null) {
      if (start === -1) start = i;
      size++;
    } else {
      if (start !== -1) {
        holes.push({ start, size });
        start = -1;
        size = 0;
      }
    }
  }
  return holes;
};

/**
 * External Fragmentation = Total Free Memory − Largest Contiguous Free Block
 * Returns { totalFree, largestBlock, externalFrag, fragRatio }
 */
export const calcFragmentation = (memory) => {
  const holes = findHoles(memory);
  const totalFree = holes.reduce((s, h) => s + h.size, 0);
  const largestBlock = holes.length > 0 ? Math.max(...holes.map(h => h.size)) : 0;
  const externalFrag = totalFree - largestBlock;
  const fragRatio = totalFree > 0 ? externalFrag / totalFree : 0;
  return { totalFree, largestBlock, externalFrag, fragRatio, numHoles: holes.length };
};

/**
 * Internal fragmentation: when allocated size > requested size.
 * We round up every request to the nearest power-of-2 bytes.
 */
export const calcInternalFrag = (requestedSize) => {
  if (requestedSize <= 0) return 0;
  let rounded = 1;
  while (rounded < requestedSize) rounded <<= 1;
  return rounded - requestedSize;
};

// ─── First Fit ───────────────────────────────────────────────────────────────
export const calculateFirstFit = (memory, size) => {
  const scanned = [];
  const chosen = [];
  let holeStart = -1;
  let holeSize = 0;

  for (let i = 0; i < memory.length; i++) {
    scanned.push(i);
    if (memory[i] === null) {
      if (holeStart === -1) holeStart = i;
      holeSize++;
      if (holeSize === size) {
        for (let j = 0; j < size; j++) chosen.push(holeStart + j);
        break;
      }
    } else {
      holeStart = -1;
      holeSize = 0;
    }
  }
  const success = chosen.length === size;
  return {
    scanned, chosen,
    totalScans: scanned.length,
    success,
    internalFrag: success ? calcInternalFrag(size) : 0,
    costExplanation: success
      ? `Stopped at index ${chosen[0]} — scanned ${scanned.length} slot(s) before finding the first fit.`
      : `No gap of size ${size} found after scanning all ${memory.length} slots.`,
  };
};

// ─── Best Fit ────────────────────────────────────────────────────────────────
export const calculateBestFit = (memory, size) => {
  const scanned = [];
  const chosen = [];
  let holeStart = -1;
  let holeSize = 0;
  let bestStart = -1;
  let bestSize = Infinity;

  const tryHole = () => {
    if (holeSize >= size && holeSize < bestSize) {
      bestSize = holeSize;
      bestStart = holeStart;
    }
  };

  for (let i = 0; i < memory.length; i++) {
    scanned.push(i);
    if (memory[i] === null) {
      if (holeStart === -1) holeStart = i;
      holeSize++;
    } else {
      tryHole();
      holeStart = -1;
      holeSize = 0;
    }
  }
  tryHole();

  if (bestStart !== -1) {
    for (let j = 0; j < size; j++) chosen.push(bestStart + j);
  }
  const success = chosen.length === size;
  return {
    scanned, chosen,
    totalScans: scanned.length,
    success,
    internalFrag: success ? calcInternalFrag(size) : 0,
    costExplanation: success
      ? `Chose the tightest gap at index ${bestStart} (size ${bestSize}) — required a full sweep of all ${memory.length} slots to guarantee minimum waste.`
      : `No gap of size ${size} found after a full sweep of ${memory.length} slots.`,
  };
};

// ─── Worst Fit ───────────────────────────────────────────────────────────────
export const calculateWorstFit = (memory, size) => {
  const scanned = [];
  const chosen = [];
  let holeStart = -1;
  let holeSize = 0;
  let worstStart = -1;
  let worstSize = -1;

  const tryHole = () => {
    if (holeSize >= size && holeSize > worstSize) {
      worstSize = holeSize;
      worstStart = holeStart;
    }
  };

  for (let i = 0; i < memory.length; i++) {
    scanned.push(i);
    if (memory[i] === null) {
      if (holeStart === -1) holeStart = i;
      holeSize++;
    } else {
      tryHole();
      holeStart = -1;
      holeSize = 0;
    }
  }
  tryHole();

  if (worstStart !== -1) {
    for (let j = 0; j < size; j++) chosen.push(worstStart + j);
  }
  const success = chosen.length === size;
  return {
    scanned, chosen,
    totalScans: scanned.length,
    success,
    internalFrag: success ? calcInternalFrag(size) : 0,
    costExplanation: success
      ? `Chose the largest gap at index ${worstStart} (size ${worstSize}) to leave maximum remnant space — full O(N) sweep required.`
      : `No gap of size ${size} found after a full sweep of ${memory.length} slots.`,
  };
};

// ─── Next Fit ────────────────────────────────────────────────────────────────
export const calculateNextFit = (memory, size, pointer) => {
  const scanned = [];
  const chosen = [];
  let holeStart = -1;
  let holeSize = 0;

  const tryFrom = (start, end) => {
    for (let i = start; i < end; i++) {
      scanned.push(i);
      if (memory[i] === null) {
        if (holeStart === -1) holeStart = i;
        holeSize++;
        if (holeSize === size) {
          for (let j = 0; j < size; j++) chosen.push(holeStart + j);
          return true;
        }
      } else {
        holeStart = -1;
        holeSize = 0;
      }
    }
    return false;
  };

  const found = tryFrom(pointer, memory.length) || (() => {
    holeStart = -1; holeSize = 0;
    return tryFrom(0, pointer);
  })();

  const success = chosen.length === size;
  const newPointer = success ? (chosen[0] + size) % memory.length : pointer;
  return {
    scanned, chosen,
    totalScans: scanned.length,
    success,
    newPointer,
    internalFrag: success ? calcInternalFrag(size) : 0,
    costExplanation: success
      ? `Resumed from pointer at index ${pointer}, found fit at ${chosen[0]} — scanned ${scanned.length} slot(s) (circular).`
      : `No gap of size ${size} found even after full circular sweep from pointer ${pointer}.`,
  };
};

// ─── Fragment Gap Counting ────────────────────────────────────────────────────
export const countWastedGaps = (memory) => {
  let gaps = 0;
  let inGap = false;
  for (let i = 0; i < memory.length; i++) {
    if (memory[i] === null) {
      if (!inGap) { gaps++; inGap = true; }
    } else {
      inGap = false;
    }
  }
  return gaps;
};

// ─── Scenario Generators ─────────────────────────────────────────────────────
export const SCENARIOS = {
  default: {
    label: 'Standard',
    description: 'A balanced mix of allocs and frees across multiple processes.',
    requests: [
      { id: '1',  type: 'alloc', pid: 1, processId: 'P1',  size: 4, priority: 'normal' },
      { id: '2',  type: 'alloc', pid: 2, processId: 'P2',  size: 6, priority: 'high'   },
      { id: '3',  type: 'alloc', pid: 3, processId: 'P3',  size: 5, priority: 'normal' },
      { id: '4',  type: 'free',  pid: 2, processId: 'P2' },
      { id: '5',  type: 'alloc', pid: 4, processId: 'P4',  size: 3, priority: 'low'    },
      { id: '6',  type: 'alloc', pid: 5, processId: 'P5',  size: 5, priority: 'high'   },
      { id: '7',  type: 'free',  pid: 1, processId: 'P1' },
      { id: '8',  type: 'alloc', pid: 6, processId: 'P6',  size: 2, priority: 'normal' },
      { id: '9',  type: 'alloc', pid: 7, processId: 'P7',  size: 7, priority: 'high'   },
      { id: '10', type: 'free',  pid: 4, processId: 'P4' },
      { id: '11', type: 'alloc', pid: 8, processId: 'P8',  size: 4, priority: 'normal' },
      { id: '12', type: 'alloc', pid: 9, processId: 'P9',  size: 6, priority: 'high'   },
      { id: '13', type: 'free',  pid: 5, processId: 'P5' },
      { id: '14', type: 'alloc', pid: 10, processId: 'P10', size: 5, priority: 'normal' },
      { id: '15', type: 'free',  pid: 3,  processId: 'P3' },
      { id: '16', type: 'alloc', pid: 11, processId: 'P11', size: 6, priority: 'low'    },
      { id: '17', type: 'alloc', pid: 12, processId: 'P12', size: 2, priority: 'normal' },
      { id: '18', type: 'free',  pid: 6,  processId: 'P6' },
      { id: '19', type: 'alloc', pid: 13, processId: 'P13', size: 3, priority: 'normal' },
    ],
  },
  deathSpiral: {
    label: '💀 Death Spiral',
    description: 'Alternating 1-slot and 5-slot allocs/frees designed to maximise external fragmentation.',
    requests: [
      { id: 'd1',  type: 'alloc', pid: 1,  processId: 'P1',  size: 5, priority: 'normal' },
      { id: 'd2',  type: 'alloc', pid: 2,  processId: 'P2',  size: 1, priority: 'normal' },
      { id: 'd3',  type: 'alloc', pid: 3,  processId: 'P3',  size: 5, priority: 'normal' },
      { id: 'd4',  type: 'alloc', pid: 4,  processId: 'P4',  size: 1, priority: 'normal' },
      { id: 'd5',  type: 'alloc', pid: 5,  processId: 'P5',  size: 5, priority: 'normal' },
      { id: 'd6',  type: 'alloc', pid: 6,  processId: 'P6',  size: 1, priority: 'normal' },
      { id: 'd7',  type: 'free',  pid: 1,  processId: 'P1' },
      { id: 'd8',  type: 'free',  pid: 3,  processId: 'P3' },
      { id: 'd9',  type: 'free',  pid: 5,  processId: 'P5' },
      { id: 'd10', type: 'alloc', pid: 7,  processId: 'P7',  size: 4, priority: 'high'   },
      { id: 'd11', type: 'alloc', pid: 8,  processId: 'P8',  size: 4, priority: 'high'   },
      { id: 'd12', type: 'alloc', pid: 9,  processId: 'P9',  size: 4, priority: 'high'   },
      { id: 'd13', type: 'alloc', pid: 10, processId: 'P10', size: 4, priority: 'normal' },
      { id: 'd14', type: 'free',  pid: 2,  processId: 'P2' },
      { id: 'd15', type: 'free',  pid: 4,  processId: 'P4' },
      { id: 'd16', type: 'alloc', pid: 11, processId: 'P11', size: 6, priority: 'high'   },
    ],
  },
  stressTest: {
    label: '⚡ Stress Test',
    description: 'Rapid large allocations followed by mass frees to saturate and fragment memory.',
    requests: [
      { id: 's1', type: 'alloc', pid: 1,  processId: 'P1',  size: 8, priority: 'high'   },
      { id: 's2', type: 'alloc', pid: 2,  processId: 'P2',  size: 8, priority: 'high'   },
      { id: 's3', type: 'alloc', pid: 3,  processId: 'P3',  size: 8, priority: 'high'   },
      { id: 's4', type: 'alloc', pid: 4,  processId: 'P4',  size: 6, priority: 'normal' },
      { id: 's5', type: 'free',  pid: 1,  processId: 'P1' },
      { id: 's6', type: 'free',  pid: 3,  processId: 'P3' },
      { id: 's7', type: 'alloc', pid: 5,  processId: 'P5',  size: 3, priority: 'low'    },
      { id: 's8', type: 'alloc', pid: 6,  processId: 'P6',  size: 3, priority: 'low'    },
      { id: 's9', type: 'alloc', pid: 7,  processId: 'P7',  size: 3, priority: 'normal' },
      { id: 's10', type: 'alloc', pid: 8, processId: 'P8',  size: 5, priority: 'high'   },
      { id: 's11', type: 'free',  pid: 2, processId: 'P2' },
      { id: 's12', type: 'alloc', pid: 9, processId: 'P9',  size: 9, priority: 'high'   },
      { id: 's13', type: 'free',  pid: 4, processId: 'P4' },
      { id: 's14', type: 'alloc', pid: 10, processId: 'P10', size: 7, priority: 'high'  },
      { id: 's15', type: 'free',  pid: 5,  processId: 'P5' },
      { id: 's16', type: 'alloc', pid: 11, processId: 'P11', size: 4, priority: 'normal'},
    ],
  },
};
