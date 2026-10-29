# Memory Allocator Race — Comprehensive Project Report

**Version:** 2.0  
**Platform:** Web (SPA)  
**Primary Domain:** Operating Systems · Analysis of Algorithms (AOA)  
**Date:** April 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Programming Languages](#2-programming-languages)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure & Architecture](#4-project-structure--architecture)
5. [Algorithms Covered](#5-algorithms-covered)
6. [AOA / Analysis of Algorithms Integration](#6-aoa--analysis-of-algorithms-integration)
7. [Key Features](#7-key-features)
8. [Component Reference](#8-component-reference)
9. [Data Flow & State Management](#9-data-flow--state-management)
10. [Simulation Engine](#10-simulation-engine)
11. [User Interface Design](#11-user-interface-design)
12. [How to Run Locally](#12-how-to-run-locally)
13. [Future Enhancements](#13-future-enhancements)

---

## 1. Executive Summary

**Memory Allocator Race** is a comprehensive, interactive educational platform built as a single-page React application. It simulates and visualizes how modern Operating Systems handle dynamic memory allocation across **four distinct algorithms** running simultaneously on shared memory.

The platform serves two goals:

- **Visualization:** Watch each algorithm compete in real-time — scanning, placing, and fragmenting a 32-slot RAM array.
- **Education:** Explain *why* each algorithm behaves the way it does through embedded AOA theory: case analysis, algorithm paradigms, amortised analysis, and performance radar charts.

Version 2.0 significantly upgrades V1 with: fragmentation metrics, process priority tracking, custom request queues, scenario modeling (Standard / Death Spiral / Stress Test), and a full **AOA theory tab** linked to live simulation data.

---

## 2. Programming Languages

| Language | Version | Role |
|---|---|---|
| **JavaScript (ES2022+)** | ES Modules (`"type": "module"`) | All application logic, algorithm functions, React components |
| **JSX** | React 18 dialect | Component markup embedded in `.jsx` files |
| **CSS** | Vanilla + Tailwind utility classes | Styling, animations, dark-mode theme |
| **HTML5** | Standard | Entry point (`index.html`), semantic document structure |
| **JSON** | — | Package manifest (`package.json`), project configuration |

> **No TypeScript** is used — the codebase is pure JavaScript with JSX. Type safety is enforced through careful prop signatures and documented function contracts in `algorithms.js`.

### JavaScript Features Used
- **ES Modules** (`import` / `export`) throughout
- **Arrow functions**, destructuring assignment, spread operator
- **Array methods:** `.map()`, `.filter()`, `.reduce()`, `.find()`, `.some()`
- **Closures** for phase-based animation callbacks
- **`useState`, `useEffect`, `useCallback`** hooks (React 18)
- **Bitwise left-shift** (`<<=`) for power-of-2 rounding in internal fragmentation calculation

---

## 3. Technology Stack

### 3.1 Core Framework

| Tool | Version | Purpose |
|---|---|---|
| **React** | `^18.3.1` | Component-based UI, state management, lifecycle hooks |
| **Vite** | `^5.4.10` | Build tool, dev server with Hot Module Replacement (HMR), ES module bundling |
| **react-dom** | `^18.3.1` | DOM rendering / mounting via `ReactDOM.createRoot()` |

**Why Vite?** Zero-config, near-instant HMR (< 50ms refresh on file save), native ES module support, and significantly faster cold starts than CRA or Webpack.

### 3.2 Styling

| Tool | Version | Purpose |
|---|---|---|
| **Tailwind CSS** | `^4.2.2` | Utility-first CSS framework for all layout, spacing, color, and typography |
| **@tailwindcss/postcss** | `^4.2.2` | PostCSS integration — processes Tailwind directives via `@import "tailwindcss"` |
| **PostCSS** | `^8.5.9` | CSS transformation pipeline (autoprefixer + Tailwind) |
| **Autoprefixer** | `^10.4.27` | Adds vendor prefixes (`-webkit-`, `-moz-`) for cross-browser compatibility |

**Tailwind v4 Setup:**  
The project uses Tailwind v4's new import syntax. `src/index.css` contains only:
```css
@import "tailwindcss";
```
This replaces the older `@tailwind base/components/utilities` directives.

### 3.3 Visualization & Icons

| Library | Version | Purpose |
|---|---|---|
| **Recharts** | `^3.8.1` | SVG-based charting: `LineChart` (cumulative scan overhead), `BarChart` (case analysis), `RadarChart` (AOA performance radar) |
| **lucide-react** | `^1.8.0` | Pixel-perfect SVG icons (`Play`, `Pause`, `Activity`, `Sigma`, `AlertTriangle`, etc.) |

### 3.4 Development & Tooling

| Tool | Version | Purpose |
|---|---|---|
| **ESLint** | `^9.13.0` | JavaScript linting with React-specific rules |
| **eslint-plugin-react** | `^7.37.2` | React component linting rules |
| **eslint-plugin-react-hooks** | `^5.0.0` | Enforces Rules of Hooks |
| **eslint-plugin-react-refresh** | `^0.4.14` | HMR compatibility linting |
| **@vitejs/plugin-react** | `^4.3.3` | Vite plugin enabling React Fast Refresh |
| **@types/react** | `^18.3.12` | TypeScript definitions (used by IDE for IntelliSense even in JS projects) |

---

## 4. Project Structure & Architecture

```
memory-allocator/
│
├── index.html                  # HTML entry point; mounts React root
├── package.json                # Dependencies, scripts
├── vite.config.js              # Vite + React plugin config
├── tailwind.config.js          # Tailwind content paths
├── postcss.config.js           # PostCSS pipeline (@tailwindcss/postcss)
├── eslint.config.js            # ESLint v9 flat config
│
└── src/
    ├── main.jsx                # ReactDOM.createRoot() entry
    ├── App.jsx                 # Root component — full simulation orchestrator
    ├── index.css               # Global CSS (@import "tailwindcss")
    ├── App.css                 # Base resets
    │
    ├── utils/
    │   └── algorithms.js       # Pure algorithm functions + SCENARIOS + metrics
    │
    └── components/
        ├── FragmentationDashboard.jsx   # Live ext/int fragmentation metrics
        ├── ComparisonMatrix.jsx         # Ranked side-by-side algorithm comparison
        ├── RequestQueue.jsx             # Scrollable request queue with priority
        ├── CustomQueueBuilder.jsx       # User-built custom request queue form
        ├── TradeoffPanel.jsx            # Expandable pros/cons per algorithm
        └── DAAPanel.jsx                 # Full AOA theory tab (5 sections)
```

### Architecture Principles

- **Pure logic / UI separation:** `algorithms.js` exports only pure functions with zero side effects. React state is never mutated inside algorithm functions.
- **Phase-based state machine:** The simulation runs through 3 phases per step: `idle → scanning → committing`. Each phase transition is driven by `useEffect` timers.
- **Derived state:** `requests` is derived at render time from either the active scenario or the custom queue — no duplication.

---

## 5. Algorithms Covered

All four algorithms operate on a **32-slot memory array** (`null` = free, `"Pn"` = occupied by process n).

### 5.1 First Fit (Blue — `#3b82f6`)

| Property | Value |
|---|---|
| **Strategy** | Linear scan from index 0; stops at **first** qualifying gap |
| **Time Complexity** | O(N) worst, Ω(k) best (k = gap index) |
| **Space Complexity** | O(1) |
| **AOA Paradigm** | Linear Search |
| **Early Termination** | ✓ Yes |

**Behavior:** Fastest algorithm in practice because it terminates as soon as one suitable gap is found. Causes heavy front-end address clustering over time, increasing external fragmentation.

### 5.2 Best Fit (Green — `#10b981`)

| Property | Value |
|---|---|
| **Strategy** | Full sweep to find the **smallest** gap ≥ requested size |
| **Time Complexity** | Θ(N) in all cases |
| **Space Complexity** | O(1) |
| **AOA Paradigm** | Greedy (Minimize Waste) |
| **Early Termination** | ✗ No — must verify no smaller gap exists |

**Behavior:** Minimises per-allocation waste but paradoxically creates many tiny unusable holes over time. Always pays the full O(N) scan cost.

### 5.3 Worst Fit (Red — `#ef4444`)

| Property | Value |
|---|---|
| **Strategy** | Full sweep to find the **largest** gap available |
| **Time Complexity** | Θ(N) in all cases |
| **Space Complexity** | O(1) |
| **AOA Paradigm** | Greedy (Maximize Remnant) |
| **Early Termination** | ✗ No |

**Behavior:** Leaves the largest possible remnant after each placement, theoretically useful for uniform-size future requests. Fails under mixed workloads and shares the same Θ(N) overhead as Best Fit.

### 5.4 Next Fit (Orange — `#f97316`)

| Property | Value |
|---|---|
| **Strategy** | Like First Fit, but resumes from a **saved circular pointer** |
| **Time Complexity** | O(N) worst, Ω(1) best, amortised O(1) in uniform workloads |
| **Space Complexity** | O(1) + 1 integer pointer |
| **AOA Paradigm** | Circular Linear Search + Amortised Analysis |
| **Early Termination** | ✓ Yes |

**Behavior:** Distributes allocations uniformly across all memory addresses, avoiding the front-clustering problem of First Fit. The pointer position is visualised as an orange marker on the memory strip.

---

## 6. AOA / Analysis of Algorithms Integration

The platform includes a dedicated **AOA tab** (∑ icon) with three sub-sections:

### 6.1 Case Analysis

Each algorithm is presented with its formal complexity across three cases:

| Algorithm | Best Ω | Average Θ | Worst O |
|---|---|---|---|
| First Fit  | Ω(k)   | Θ(n/2)   | O(n) |
| Best Fit   | Ω(n)   | Θ(n)     | O(n) |
| Worst Fit  | Ω(n)   | Θ(n)     | O(n) |
| Next Fit   | Ω(1)   | Θ(n/2)   | O(n) |

Live simulation data (avg scans/alloc) is displayed alongside theoretical predictions, letting users directly verify theoretical results with observed behavior.

A **bar chart** visualises the theoretical scan counts for best/average/worst cases at n=32.

### 6.2 Algorithm Paradigms

Six expandable cards covering:

| Paradigm | Algorithms | AOA Connection |
|---|---|---|
| **Greedy Algorithm** | Best Fit, Worst Fit | Locally optimal choice per step; related to Fractional Knapsack, Huffman Coding |
| **Linear Search** | First Fit, Next Fit | Sequential scan, O(n) lower bound without indexed metadata |
| **Amortised Analysis** | Next Fit | Over m operations, total scans ≤ 2n → amortised O(1) |
| **Space-Time Tradeoff** | All four | O(1) space, O(n) time baseline; sorted free-list gives O(log n) time at O(n) space cost |
| **Lower Bound Theory** | All four | Proven O(n) lower bound for comparison-based sequential allocation |
| **Recurrence Relations** | All four | T(n) = T(n−1) + O(1), T(0) = 0 → T(n) = O(n); amortised via sigma notation |

Each card includes:
- Detailed description
- Concrete examples from the simulator  
- Known limitations
- Links to related AOA topics (Merge Sort, Master Theorem, Binary Search, MSTs, etc.)

### 6.3 Performance Radar

A `RadarChart` (Recharts) comparing all four algorithms across 5 qualitative AOA dimensions:

| Axis | Measures |
|---|---|
| **Speed** | How early the algorithm terminates |
| **Space Efficiency** | Quality of memory utilisation |
| **Frag Resistance** | Resistance to external fragmentation over time |
| **Simplicity** | Ease of implementation and formal reasoning |
| **Fairness** | Uniformity of address distribution |

---

## 7. Key Features

### 7.1 Fragmentation Metrics Dashboard
- **External Fragmentation** = `Total Free Memory − Largest Contiguous Block` — colour-coded progress bar (green/yellow/red)  
- **Internal Fragmentation** — power-of-2 rounding simulation; a 5-slot request conceptually allocates 8 slots in a paged system, wasting 3  
- **Per-algorithm cards** showing: Total Free, Largest Block, Ext. Frag (slots), Free Holes count  
- Updates live after every committed simulation step

### 7.2 Scenario Modeling

| Scenario | Design Intent |
|---|---|
| **Standard** | Balanced mix of alloc and free operations across multiple process sizes |
| **💀 Death Spiral** | Alternating 1-slot and 5-slot allocs + selective frees → maximum fragmentation |
| **⚡ Stress Test** | Mass large allocations then mass frees → tests memory saturation and recovery |

### 7.3 Custom Request Queue

Users can build their own request sequences:
- **Type:** ALLOC or FREE
- **Process ID:** P1–P20 (FREE dropdown auto-filters to currently allocated PIDs only)
- **Size:** 1–20 slots with quick-pick buttons (2, 4, 6, 8)
- **Priority:** HIGH / NORMAL / LOW
- **Toggle switch:** Enable/disable custom queue (default queue runs when off)
- **Queue preview:** All added entries shown with delete-per-row and "Clear all"

### 7.4 Process Metadata & Priority Tracking
- Every request carries `{ pid, processId, size, priority }` metadata
- Priority badges (HIGH/NORMAL/LOW) visible in the request queue sidebar
- Simulates kernel-level process metadata that would influence real scheduler decisions

### 7.5 Side-by-Side Comparison Matrix
- Algorithms ranked by apps housed (tiebreaker: fewest scans)
- Medal badges (🥇🥈🥉) per rank
- Progress bars for: Apps Housed, Scan Cost, External Fragmentation
- **Efficiency Score** = (1 − scans/maxScans) × 100

### 7.6 Algorithm Trade-off Panels
- Expandable per-algorithm panel showing Speed, Space, Complexity badges
- Detailed plain-English explanation of the algorithm's behaviour
- Pros ✓ and Cons ✗ lists

### 7.7 Cumulative Scan Overhead Chart
- `LineChart` (Recharts) with one line per algorithm
- X-axis: simulation step, Y-axis: total scans performed
- Best Fit and Worst Fit lines consistently overlap (both Θ(n))
- First Fit and Next Fit slope shallower due to early termination

### 7.8 Post-Run Cost Analysis
- Appears on Analytics tab after simulation completes
- Per-algorithm: success rate %, avg scans/alloc, external frag on exit, internal frag total

### 7.9 Simulation Controls

| Control | Description |
|---|---|
| **Play / Pause** | Auto-advance at selected speed |
| **Step (▶\|)** | Advance exactly one request |
| **Reset (↺)** | Clears all memory and metrics |
| **Speed Slider** | 100ms – 2000ms per step |
| **Skip Animation Frames** | Commits instantly; disables scanning/committing delays |

### 7.10 Phase Animation System

| Phase | Visual |
|---|---|
| **Scanning** | Targeted slots flash **yellow** (`rgba(250,204,21,0.85)`) with golden glow |
| **Committing (success)** | Slots flash **emerald green** with bright glow + slight vertical scale |
| **Committing (failure)** | Slots flash **red** indicating allocation failure |
| **Idle** | Slot colour = algorithm theme with opacity proportional to process ID |

---

## 8. Component Reference

| File | Lines | Responsibility |
|---|---|---|
| `App.jsx` | ~650 | Root orchestrator: state machine, phase clock, all tab content |
| `algorithms.js` | ~303 | Pure functions: `calculateFirstFit/BestFit/WorstFit/NextFit`, `calcFragmentation`, `calcInternalFrag`, `findHoles`, `countWastedGaps`, `SCENARIOS` |
| `FragmentationDashboard.jsx` | ~90 | Per-algo metric cards with ext/int frag bars |
| `ComparisonMatrix.jsx` | ~80 | Ranked comparison cards with score bars |
| `RequestQueue.jsx` | ~75 | Scrollable queue showing past/current/upcoming requests |
| `CustomQueueBuilder.jsx` | ~190 | Full form UI for building a custom request sequence |
| `TradeoffPanel.jsx` | ~110 | Expandable trade-off analysis per algorithm |
| `DAAPanel.jsx` | ~450 | 3-section AOA theory panel (Case Analysis, Paradigms, Radar) |

---

## 9. Data Flow & State Management

```
User Action
    │
    ▼
App.jsx (useState)
    │
    ├── scenario ──────────────────── SCENARIOS[scenario].requests
    ├── customRequests ─────────────── overrides requests when useCustomQueue=true
    ├── useCustomQueue (bool)
    │
    ├── algos { first, best, worst, next }
    │     ├── memory[32]         ← null | "Pn"
    │     ├── appsHoused
    │     ├── failedAllocs
    │     ├── totalScans
    │     ├── totalIntFrag
    │     ├── nextFitPointer     ← Next Fit only
    │     ├── lastCostNote
    │     └── fragStats { totalFree, largestBlock, externalFrag, fragRatio, numHoles }
    │
    ├── phase (idle | scanning | committing)
    ├── pendingUpdates             ← computed by algorithm functions, applied on commit
    ├── chartData[]                ← cumulative scan history for Recharts
    └── internalFragByAlgo {}      ← running power-of-2 rounding waste
```

**Step Lifecycle:**
1. `handleStepStart()` → calls `calculateXxxFit()` for all 4 algorithms → sets `pendingUpdates` → sets phase `scanning`
2. Phase clock (`useEffect`) waits `speedMs × 0.35` → sets phase `committing`
3. Phase clock waits again → calls `applyUpdates()` → writes to `algos`, `chartData`, increments `currentReqIndex` → sets phase `idle`

---

## 10. Simulation Engine

### `src/utils/algorithms.js` — Exported Functions

| Function | Signature | Returns |
|---|---|---|
| `findHoles(memory)` | `Array<null\|string>` | `{ start, size }[]` — all contiguous free regions |
| `calcFragmentation(memory)` | `Array` | `{ totalFree, largestBlock, externalFrag, fragRatio, numHoles }` |
| `calcInternalFrag(size)` | `number` | Wasted slots under power-of-2 rounding |
| `countWastedGaps(memory)` | `Array` | Number of distinct free holes |
| `calculateFirstFit(memory, size)` | `Array, number` | `{ scanned[], chosen[], success, totalScans, internalFrag, costExplanation, newPointer }` |
| `calculateBestFit(memory, size)` | `Array, number` | Same shape as above |
| `calculateWorstFit(memory, size)` | `Array, number` | Same shape as above |
| `calculateNextFit(memory, size, pointer)` | `Array, number, number` | Same shape + `newPointer` |
| `SCENARIOS` | — | Object of `{ label, description, requests[] }` |

### SCENARIOS Object

```js
SCENARIOS = {
  default: { label: 'Standard',      requests: [...] },
  death:   { label: '💀 Death Spiral', requests: [...] },
  stress:  { label: '⚡ Stress Test',  requests: [...] },
}
```

Each request object shape:
```js
{ id: string, type: 'alloc'|'free', pid: number,
  processId: 'P1'...'P20', size?: number, priority?: 'high'|'normal'|'low' }
```

---

## 11. User Interface Design

### Design System
- **Base theme:** Dark slate (`slate-950` background, `slate-900` panels)  
- **Accent palette:** Blue (First Fit), Emerald (Best Fit), Red (Worst Fit), Orange (Next Fit), Purple (AOA tab)  
- **Typography:** System sans-serif stack; monospace for complexity notation  
- **Borders:** Translucent algorithm-coloured borders on each algorithm card  
- **Glassmorphism:** `bg-slate-900/80`, `backdrop-blur` for layered depth  

### Layout
- **Sidebar (w-72):** Brand, scenario picker, controls, speed slider, custom queue builder, request queue, progress bar  
- **Main area:** 4-tab layout — Memory View / Analytics / AOA / Learn  
- **Memory View:** Fragmentation Dashboard (top) + 4 algorithm cards (each with memory strip, cost note, trade-off panel)  
- **Analytics:** Comparison Matrix + Line Chart + Post-Run Cost Analysis  
- **AOA:** Live scans header + 3 sub-sections  
- **Learn:** 5 educational cards (static)  

### Responsive Behaviour
- Sidebar fixed at `w-72`; main area `flex-1` fills remaining width  
- Fragmentation Dashboard: `grid-cols-2` → `xl:grid-cols-4`  
- Comparison Matrix: `grid-cols-2` → `xl:grid-cols-4`  
- Full-height layout with `overflow-y-auto` on scrollable regions  

---

## 12. How to Run Locally

### Prerequisites
- **Node.js** v18+ (LTS recommended)
- **npm** v9+

```bash
# 1. Navigate to the project directory
cd d:\projects\memory-allocator

# 2. Install all npm dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

Open **http://localhost:5173/** in your browser (or whichever port Vite assigns if 5173 is occupied — check terminal output).

### Other Scripts

```bash
npm run build     # Production bundle → dist/
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint on all source files
```

### Build Output
Vite compiles to `dist/` with:
- Minified JS bundles (code-split by dynamic imports)
- Hashed filenames for cache busting
- Inlined critical CSS

---

## 13. Future Enhancements

| Priority | Feature | Notes |
|---|---|---|
| High | **Virtual Memory Layer** | Abstract physical frames from virtual addresses; show page table |
| High | **Buddy System Algorithm** | Power-of-2 block splitting — natural extension of internal fragmentation demo |
| Medium | **Concurrency / Critical Sections** | Mutex visualisation; show race conditions when two algorithms compete for the same slot |
| Medium | **Export as PDF** | Download full post-run report as a formatted PDF |
| Medium | **Interval Tree Optimisation Mode** | Toggle O(log n) Best Fit using an augmented BST for direct comparison with O(n) baseline |
| Low | **Persistence** | Save custom queues to `localStorage` for reuse across sessions |
| Low | **Accessibility** | ARIA labels, keyboard navigation, high-contrast mode |

---

*Report generated for Memory Allocator Race v2.0 — OS Simulation Platform.*  
*Project location: `d:\projects\memory-allocator`*
