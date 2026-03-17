# Valley Verde Dashboard — Frontend Developer's Guide

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [File Structure](#3-file-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Architecture & Data Flow](#6-architecture--data-flow)
7. [Types](#7-types-typests)
8. [Services Layer](#8-services-layer-servicesdatats)
9. [Components](#9-components)
   - [App.tsx — Root Component](#apptsx--root-component)
   - [LandingPage](#landingpage)
   - [StatsView](#statsview)
   - [CommunityNeedsView](#communityneedsview)
   - [DemographicsView](#demographicsview)
   - [TimelineView](#timelineview)
10. [Routing & Navigation](#10-routing--navigation)
11. [Styling](#11-styling)
12. [Build & Vite Configuration](#12-build--vite-configuration)
13. [Google Apps Script Integration](#13-google-apps-script-integration)
14. [Known Issues & Gotchas](#14-known-issues--gotchas)

---

## 1. Project Overview

Valley Verde Dashboard is a React + TypeScript single-page application that visualizes community food-insecurity survey data collected via Google Forms. It provides four main views:

- **Home** — Landing/marketing page with links to the survey and dashboard tabs
- **Community Needs** — Gap analysis, need rankings, education interests, and future outlook charts
- **Demographics** — Income vs. worry scatter plot, ethnicity/age breakdowns, an interactive Leaflet map, and ZIP-code trends
- **Timeline** — Month-by-month history of survey responses

Data is fetched from a Python/Flask backend (`backend/app.py`) which reads from a Google Sheet populated by the Google Form.

---

## 2. Tech Stack

### Runtime Dependencies

| Package | Version | Role |
|---|---|---|
| `react` / `react-dom` | ^19.2.4 | UI framework |
| `recharts` | ^3.7.0 | All chart visualizations (Bar, Line, Pie, Scatter) |
| `leaflet` + `react-leaflet` | ^1.9.4 / ^5.0.0 | Interactive map with circle overlays |
| `lucide-react` | 0.562.0 | Icon library |

### Dev Dependencies

| Package | Role |
|---|---|
| `vite` ^6.2.0 | Bundler and dev server |
| `@vitejs/plugin-react` ^5.0.0 | JSX transform with fast-refresh |
| `typescript` ~5.8.2 | Static type checking |
| `@types/node` ^22.14.0 | Node types for Vite config |

### Styling

**Tailwind CSS** is loaded via a CDN `<script>` tag in `index.html`. It is **not** an npm dependency and there is no `tailwind.config.js`. All styling uses utility classes inline in JSX.

**Google Fonts** (`Open Sans`) is loaded via a CSS `@import` in the `<style>` block of `index.html`.

---

## 3. File Structure

```
frontend/
├── index.html              # HTML shell; loads Tailwind CDN, Google Fonts, importmap
├── index.tsx               # React DOM entry point; mounts <App /> to #root
├── App.tsx                 # Root component: layout, tab routing, data fetch, CSV export
├── types.ts                # All shared TypeScript interfaces and union types
├── metadata.json           # App name/description (no runtime role)
├── googleAppsScript.js     # Google Apps Script pasted into Sheets — NOT part of the build
├── package.json            # NPM manifest, scripts, and dependencies
├── tsconfig.json           # TypeScript compiler configuration
├── vite.config.ts          # Vite bundler, dev-server, env injection, and chunk splitting
├── components/
│   ├── LandingPage.tsx     # Home screen with survey link and feature overview
│   ├── StatsView.tsx       # Three KPI cards (responses, verified, avg worry)
│   ├── CommunityNeedsView.tsx  # Gap analysis, need rankings, education & outlook charts
│   ├── DemographicsView.tsx    # Scatter plot, ethnicity/age charts, Leaflet map, ZIP trends
│   └── TimelineView.tsx    # Vertical month-by-month timeline of responses
└── services/
    └── data.ts             # API client, constants, and mock-data generator
```

---

## 4. Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- The backend running at `http://localhost:8000` (see `backend/` and `backend/requirements.txt`)

### Install and run

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on **port 3000** and binds to `0.0.0.0`, so it is accessible from other devices on the same network or from inside a container.

### Build for production

```bash
npm run build       # outputs to frontend/dist/
npm run preview     # serves the dist/ folder locally to verify the build
```

### Type checking

```bash
npm run typecheck   # tsc --noEmit; no files are emitted — Vite handles the build
```

---

## 5. Environment Variables

Create a `.env` file at `frontend/.env`:

```
VITE_API_URL=http://localhost:8000
GEMINI_API_KEY=your_key_here
```

| Variable | Used In | Purpose |
|---|---|---|
| `VITE_API_URL` | `services/data.ts` via `import.meta.env.VITE_API_URL` | Base URL for the Flask backend API |
| `GEMINI_API_KEY` | `vite.config.ts` `define` block | Exposed at build time as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`; referenced in config but not currently consumed by any component |

> **Note:** Only variables prefixed with `VITE_` are automatically forwarded to the browser bundle by Vite. The Gemini key is injected manually via the `define` block in `vite.config.ts` to match a `process.env.API_KEY` pattern.

---

## 6. Architecture & Data Flow

```
Google Form
    │  (on submit trigger)
    ▼
Google Sheet  ◄──── googleAppsScript.js (auto-verify, auto-tag, crisis email)
    │
    ▼
backend/app.py  (Flask + gspread)
    │
    ├── GET /api/responses/filter?range={week|month|quarter|all}
    └── GET /api/summary
              │
              ▼
        services/data.ts
              │
              ▼
           App.tsx
              │
     ┌────────┴────────┐
     ▼                 ▼
currentPeriodData  prevPeriodData   (client-side time slicing)
     │
     ├──► StatsView
     ├──► CommunityNeedsView
     ├──► DemographicsView
     └──► TimelineView
```

### Client-side time filtering

`App.tsx` always fetches the **full dataset** (`range="all"`) and then splits it into two windows on the client:

- **`currentPeriodData`** — responses from `(now − period)` to `now`
- **`prevPeriodData`** — responses from `(now − 2×period)` to `(now − period)`

This enables period-over-period delta calculations in `StatsView` without a second API call. The tradeoff is that every `timeFilter` change triggers a full data re-fetch.

### Auto-refresh

A `setInterval` runs `fetchData(true)` every **30 seconds**. During a background refresh, a spinning SVG appears in the header without blocking the UI (`isRefreshing` state). The interval is cleared and re-created whenever `timeFilter` changes to keep the closure's reference fresh.

---

## 7. Types (`types.ts`)

### `SurveyResponse` — primary data model

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Backend-generated ID (e.g. `RES-1001`) |
| `timestamp` | `string` | ISO 8601 datetime string |
| `zipCode` | `string` | Q10 of survey form |
| `email` | `string?` | Optional; presence drives `verified` |
| `verified` | `boolean` | Set server-side by the Apps Script |
| `worryLevel` | `number` | Q2: 1–5 scale |
| `futureOutlook` | `string` | Q3: one of four sentence-length option strings |
| `affordabilityBarriers` | `string[]` | Q4: multi-select food categories |
| `availabilityBarriers` | `string[]` | Q5: same category list |
| `knowledgeInterests` | `string[]` | Q6: educational topics |
| `otherNotes` | `string` | Q7: free text |
| `ageRange` | `string` | Q8: `"Under 20"` / `"20-39"` / `"40-59"` / `"Over 60"` |
| `gender` | `string` | Q9 |
| `ethnicity` | `string[]` | Q10: select-all-that-apply |
| `householdSize` | `number` | Q11: 1–6 |
| `incomeRange` | `string` | Q12: one of six string ranges |
| `crisisAlert` | `boolean` | Derived from `worryLevel >= 4` |

### `ChartDataPoint`
```ts
{ name: string; value: number; [key: string]: any }
```

### `TimeFilter`
```ts
type TimeFilter = 'week' | 'month' | 'quarter' | 'all'
```

---

## 8. Services Layer (`services/data.ts`)

### `fetchSurveyResponses(range: TimeFilter): Promise<SurveyResponse[]>`

```
GET {VITE_API_URL}/api/responses/filter?range={range}
```

The primary data-loading function called by `App.tsx`. Despite accepting a `range` parameter, the app always passes `"all"` and filters client-side.

### `fetchSummaryData(): Promise<any>`

```
GET {VITE_API_URL}/api/summary
```

Exists in the service layer but is **not called anywhere** in the current frontend code.

### `generateMockData(count: number): SurveyResponse[]`

Generates a fully correlated synthetic dataset for development and testing:
- Lower income → higher `worryLevel`
- Higher `worryLevel` → more `affordabilityBarriers`
- Timestamps spread randomly over the last 60 days

The exported `MOCK_DATA` constant is currently **commented out**; the app uses live API data only. Uncomment and swap it in `data.ts` to run the frontend without a backend.

### Domain Constants

The following arrays are exported and match the exact option strings from the Google Form:

`ZIP_CODES`, `FOOD_CATEGORIES`, `KNOWLEDGE_TOPICS`, `INCOME_RANGES`, `AGE_RANGES`, `ETHNICITIES`, `FUTURE_OUTLOOKS`

---

## 9. Components

### `App.tsx` — Root Component

The shell of the entire application. Responsibilities:

- **Layout**: a fixed left sidebar (desktop) or top mobile header, plus a `<main>` content area
- **Tab routing**: manages `activeTab` state to switch between the four views
- **Data fetching**: loads all survey data on mount and on every `timeFilter` change; runs auto-refresh every 30 s
- **CSV export**: `handleDownload()` generates a privacy-safe aggregated CSV (counts only — no individual rows) and triggers a browser download

#### State

| Variable | Type | Purpose |
|---|---|---|
| `activeTab` | `"home"\|"needs"\|"demographics"\|"timeline"` | Active view |
| `timeFilter` | `TimeFilter` | Shared filter passed to every view |
| `allData` | `SurveyResponse[]` | Full unfiltered dataset from the API |
| `currentPeriodData` | `SurveyResponse[]` | Responses within the selected window |
| `prevPeriodData` | `SurveyResponse[]` | Responses in the prior equivalent window |
| `loading` / `error` | `boolean` / `string\|null` | Fetch state |
| `showMethodology` | `boolean` | Controls the Methodology modal |
| `isRefreshing` | `boolean` | Background refresh spinner toggle |
| `lastRefresh` | `Date\|null` | Timestamp shown in the header |

#### Layout Structure

```
<div class="min-h-screen flex">
  <aside class="w-64 fixed">        ← Sidebar (hidden on mobile)
    CornLogo + Nav tabs
    Trend Alert card (hardcoded)
  </aside>
  <div class="md:hidden fixed">     ← Mobile header
  <main class="md:ml-64">
    Header Controls (time filter, Report button, Export CSV)   ← hidden on "home"
    StatsView (3 KPI cards)                                    ← hidden on "home"
    [Active view component]
    Footer with Methodology modal trigger                      ← hidden on "home"
  </main>
</div>
```

> **`CornLogo`**: An inline SVG corn cob defined at the top of `App.tsx`. Not extracted to a separate file.

---

### `LandingPage`

**File**: `components/LandingPage.tsx`  
**Props**: `onNavigate: (tab: "needs" | "demographics") => void`

Sections:

1. **Decorative banner** — tiled Lucide icons (Carrot / Leaf / Wheat / Sprout) at 15% opacity, rotated −6°
2. **Hero card** — headline, description, "Take the Survey" external link, "View Dashboard" CTA
3. **About section** — explains the affordability vs. availability gap concept
4. **How-to-use cards** — three cards linking to Gap Analysis, Demographics, and Impact Reports
5. **Privacy note** footer

---

### `StatsView`

**File**: `components/StatsView.tsx`  
**Props**: `data: SurveyResponse[]`, `prevData?: SurveyResponse[]`

Displays three KPI cards with period-over-period delta arrows:

| Card | Metric | Positive direction color |
|---|---|---|
| Total Responses | `data.length` | Red (more responses = more concern) |
| Verified Emails | filtered by `d.verified` | Red |
| Avg Worry Level | average of `worryLevel`, 1 decimal | Green (lower worry = better) |

> **Design note**: Delta arrows are red for increases and green for decreases — intentionally reversed from typical business dashboards because rising worry and growing response counts signal worsening food insecurity.

---

### `CommunityNeedsView`

**File**: `components/CommunityNeedsView.tsx`  
**Props**: `data: SurveyResponse[]`, `timeFilter?: TimeFilter`

All chart data is derived with `useMemo([data, timeFilter])`.

#### NEED_DEFINITIONS

Six food categories mapped to IDs, display labels, and Recharts colors:

| ID | Label |
|---|---|
| `produce` | Fresh Produce |
| `meatDairy` | Meat & Dairy |
| `cultural` | Cultural Foods |
| `organic` | Organic Options |
| `healthFood` | Health Foods |
| `babyFood` | Baby/Infant Food |

#### Charts

| Chart | Type | Description |
|---|---|---|
| Community Needs Over Time | `LineChart` | Time-bucketed (daily / monthly / quarterly) counts of the top 4 needs |
| Need Ranking | Custom HTML | Ranked list with progress bars, count, and share % |
| Gap Analysis | Grouped `BarChart` | "Can't Afford" (red) vs "Can't Find" (blue) per food category |
| Education Interests | Horizontal `BarChart` | `knowledgeInterests` aggregated counts |
| Future Outlook | Donut `PieChart` | `futureOutlook` distribution across 4 sentiment buckets |

#### Time-bucketing logic (Need Trend chart)

- **`week`**: 7 consecutive calendar days ending at the most-recent timestamp in `data`
- **`month`**: grouped by `YYYY-MM`, last 6 months shown
- **`quarter`**: grouped by `YYYY-Q#`, last 6 quarters shown
- **`all`**: same behavior as `month`

---

### `DemographicsView`

**File**: `components/DemographicsView.tsx`  
**Props**: `data: SurveyResponse[]`, `allData?: SurveyResponse[]`

`data` = current period; `allData` = full history (used for all-time charts and zip trends).

#### Hardcoded ZIP coordinates

12 ZIP codes in Santa Clara County (Gilroy to San Jose) have hardcoded lat/lng. ZIPs not in this lookup are silently excluded from the map. To add a new ZIP, extend the `ZIP_COORDINATES` object in `DemographicsView.tsx`.

#### `FitBoundsController`

An internal Leaflet sub-component that calls `map.fitBounds()` once on mount using a `useRef` guard to prevent repeated re-fires. It must be rendered as a child of `<MapContainer>` to access the `useMap()` hook.

#### Charts / Panels

| Visual | Description |
|---|---|
| Income vs. Food Worry | `ScatterChart`; x = numeric income midpoint, y = `worryLevel`, z = `householdSize × 50`; uses a jitter algorithm to prevent overplotting |
| Demographic Breakdown | Donut `PieChart` for ethnicity; 8 hardcoded colors |
| Age Distribution | Horizontal `BarChart`; ordered Under 20 → Over 60 |
| Response Intensity Map | React-Leaflet `MapContainer` with `Circle` overlays; radius (700–2400 m) and opacity scale with response count per ZIP |
| Area Change Over Time | `LineChart` tracking the top-3 ZIPs by month over all time |
| Historic vs Current | Static stat boxes: current count, all-time count, % change vs prior window, top-5 ZIP ranking |

#### Jitter algorithm

When multiple scatter points share the same `(income, worry)` pair, they are spread horizontally in ±3 × `xSpread` (6-unit) increments centered on the original x-value. This prevents dense overplotting on the income/worry chart.

#### ZIP validation

`isValidUSZipCode` validates `^\d{5}(-\d{4})?$` before using any ZIP for map rendering or ranking. This filters out `"None"` strings that the backend may return.

---

### `TimelineView`

**File**: `components/TimelineView.tsx`  
**Props**: `data: SurveyResponse[]`

Groups responses by calendar month (e.g. `"March 2026"`), sorted newest-first. Each month card shows:

- `avgWorry` — average `worryLevel` for that month
- `criticalAlerts` — count of responses where `crisisAlert === true`
- `topConcern` — most common `affordabilityBarriers` entry that month
- `respondents` — response count

A summary footer shows total months, total responses, and all-time average worry.

---

## 10. Routing & Navigation

There is **no React Router**. Navigation is purely state-driven:

```ts
const [activeTab, setActiveTab] = useState<"home" | "needs" | "demographics" | "timeline">("home")
```

`setActiveTab` is called directly from sidebar buttons and passed as `onNavigate` to `LandingPage`. The URL does not change between tabs. To add deep-linking or browser back/forward support, React Router or the History API would need to be introduced.

---

## 11. Styling

- Tailwind CSS utility classes are used throughout via CDN. There is no local PostCSS or Tailwind pipeline.
- All responsive breakpoints use the `md:` prefix (768 px) — the sidebar is hidden below this breakpoint.
- Custom animations (`animate-pulse`, `animate-spin`) use built-in Tailwind utilities.
- Component-specific colors are inline Tailwind values (e.g. `bg-lime-500`, `text-red-500`).
- Recharts colors are hardcoded as hex strings inside each component's constant definitions.

---

## 12. Build & Vite Configuration

Key settings in `vite.config.ts`:

| Setting | Value | Notes |
|---|---|---|
| Dev server port | `3000` | Binds to `0.0.0.0` |
| Path alias `@` | `./` (frontend root) | Use `@/components/Foo` etc. |
| `process.env.API_KEY` | `GEMINI_API_KEY` from `.env` | Defined at build time via `define` |
| Minifier | `esbuild` | No sourcemaps in production |
| Build target | `es2015` | Broad browser compatibility |

### Manual chunk splitting

To reduce initial bundle size and improve browser caching:

| Chunk name | Contents |
|---|---|
| `react-vendor` | `react`, `react-dom`, `react-is` |
| `charts` | `recharts` |
| `maps` | `leaflet`, `react-leaflet` |

---

## 13. Google Apps Script Integration

`googleAppsScript.js` is **not part of the Vite build**. It is pasted manually into the bound Apps Script of the linked Google Sheet via **Extensions → Apps Script**, then configured with an `On form submit` installable trigger.

### What it does

1. **Auto-verification**: if the respondent's email column contains `@`, writes `"TRUE"` to a `System_Verified` column (creating the column header on first run if absent).

2. **Regex tagging**: runs the free-text "other barriers" field through four patterns and writes comma-joined tags to an `Auto_Tags` column:

   | Pattern | Tag |
   |---|---|
   | `gluten\|celiac\|wheat\|dairy\|allergy` | `Dietary` |
   | `staff\|rude\|language\|english` | `Service_Quality` |
   | `time\|bus\|walk\|car` | `Transport` |
   | `organic\|fresh\|rotten` | `Food_Quality` |

3. **Crisis email alert**: if the crisis column value contains the word `"crisis"` OR the food insecurity field equals `"10"`, sends an URGENT email notification via `MailApp.sendEmail()`.

### Configuration

The following items must be updated inside `googleAppsScript.js` before deployment:

- Column index constants (`emailIdx`, `crisisIdx`, etc.) must match the actual column positions in the sheet.
- The admin recipient address (`admin@valleyverde.org`) must be replaced with the real address.

---

## 14. Known Issues & Gotchas

### Bug: `percentWorried` calculation in `TimelineView`
`TimelineView.tsx` computes `percentWorried` using `worryLevel >= 7`, but the survey scale is **1–5**, so this value is always `0`. It should be `worryLevel >= 4` (consistent with the `crisisAlert` definition in `types.ts`).

### `fetchSummaryData()` is unused
`services/data.ts` exports `fetchSummaryData()` which calls `GET /api/summary`, but no component currently calls it.

### Full dataset fetched on every filter change
`App.tsx` always calls `fetchSurveyResponses("all")` regardless of the selected `timeFilter`. Client-side slicing is fast, but this means the full dataset is re-downloaded on every filter change. For large datasets, consider either using the `range` parameter to fetch less data from the backend or implementing a client-side cache.

### Trend Alert in sidebar is hardcoded
The "Transportation +20%" trend alert shown in the sidebar (`App.tsx`) is a static string, not derived from live data.

### Tailwind via CDN
Using Tailwind from a CDN means the full Tailwind stylesheet is loaded on every page visit. For production, consider switching to Tailwind as an npm package with PurgeCSS/content configuration for a significantly smaller CSS payload.

### Leaflet CSS must be imported
`react-leaflet` requires Leaflet's CSS to render the map correctly. Verify that `leaflet/dist/leaflet.css` is imported (in `DemographicsView.tsx` or `index.tsx`) when adding or moving the map component, otherwise tiles and controls will not render.
