# FINVESTIGATE — Evidence-First Financial Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-110%2F110%20passing-brightgreen.svg)](tests/)

> *"Don't trust the AI. Investigate its evidence."*

FINVESTIGATE is an open-source, deterministic financial investigation engine and adversarial AI debate platform for SEC EDGAR filings. 

Instead of letting Large Language Models (LLMs) summarize raw financial filings—which frequently leads to hallucinations, sign-flip calculation errors, and untraceable claims—FINVESTIGATE enforces a strict **Evidence Chain Hierarchy**: 

$$\text{SEC EDGAR Source Fact} \longrightarrow \text{Deterministic Math Engine} \longrightarrow \text{Rule Anomaly Engine} \longrightarrow \text{LLM Debate/Explanation}$$

---

## System Architecture & Engineering Story

Building FINVESTIGATE was not a linear sprint of writing UI components—it was an evolution through 4 distinct phases of engineering challenges: **Ingestion**, **Storage & Deterministic Logic**, **Runtime Reliability**, and **Verification Transparency**.

```
                           +-------------------------------------+
                           |   SEC EDGAR XBRL (data.sec.gov)     |
                           +-------------------------------------+
                                              |
                                              v
                           +-------------------------------------+
                           |  Phase 1: Multi-Scale Ingestion     |
                           |  (10-K/10-Q Filtering & Parsing)    |
                           +-------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------+
| Phase 2: Deterministic Evidence Store & Domain Types                              |
|                                                                                   |
|  [Fact Schema]  --->  [Calculation Engine]  --->  [Anomaly Rules Engine]            |
|  (Source URLs)        (YoY / FCF Math)            (Cash Flow & Receivables Diverg.)|
+-----------------------------------------------------------------------------------+
                                              |
                                              v
                           +-------------------------------------+
                           | Phase 3: Runtime Reliability Gate   |
                           | (Live CIK Lookup, Retry & Timeouts) |
                           +-------------------------------------+
                                              |
                                              v
                           +-------------------------------------+
                           | Phase 4: Adversarial & Audit Layer  |
                           | (Bull vs Bear LLMs + Audit Drawer)  |
                           +-------------------------------------+
```

---

### Phase 1: Ingestion — Raw SEC EDGAR & XBRL Reality

**The Challenge:** SEC EDGAR `companyfacts` JSON contains thousands of uncurated XBRL tags across restated periods, quarterly filings (`10-Q`), annual filings (`10-K`), and overlapping durations. Early naive fetches resulted in catastrophic calculation errors (e.g., pulling a 3-month net income figure as an annual figure, producing false $-1217.7\%$ growth claims).

**The Architectural Solution:**
- **Strict XBRL Metadata Filtering:** Filtered raw SEC data strictly by `form: "10-K"`, `fp: "FY"`, and exact 365-day duration tags ($\Delta t \in [350, 380]$ days). Restated figures are resolved by taking the latest `filed` date timestamp.
- **Dynamic CIK Resolver:** Implemented real-time ticker-to-CIK mapping (`https://www.sec.gov/files/company_tickers.json`) with zero-padded 10-digit CIK formatting to support any public US ticker dynamically.
- **Primary-Source Statutory Ingestion:** Integrated dual pipelines supporting both SEC EDGAR XBRL filings and domestic Indian statutory accounting standards (BSE / Ind AS).

---

### Phase 2: Storage & Deterministic Calculation Engine

**The Challenge:** LLMs are notoriously unreliable at arithmetic. Allowing an LLM to calculate ratios, free cash flows, or year-over-year percentages guarantees financial hallucinations.

**The Architectural Solution:**
- **Zero-LLM Math Core:** All mathematical operations (YoY Growth, Receivables-to-Revenue divergence, Free Cash Flow $OCF - CapEx$) are implemented in pure TypeScript functions with Zod schema validation.
- **Sign-Flip Guard & Math Safety:** Standard growth formulas $\frac{\text{Current} - \text{Prior}}{\text{Prior}}$ break when prior numbers cross zero or are negative (e.g., swinging from $-\$2.7\text{B}$ to $+\$30.4\text{B}$). We introduced sign-flip detection (`sign_flip: true`) to convert raw math breaks into qualitative domain signals (`"turned profitable"`).
- **Rule-Based Anomaly Engine:**
  - `cash_flow_quality_divergence`: Triggers when Operating Cash Flow growth trails Net Income growth by $>10\%$.
  - `receivables_outpacing_revenue`: Triggers when Receivables growth outpaces Revenue growth by $>10\%$.

---

### Phase 3: Reliability & System Hardening

**The Challenge:** Live API calls to SEC EDGAR are rate-limited, subject to intermittent network timeouts, and vary dramatically in schema completeness across tickers (e.g., tech vs. retail vs. cyclical industries).

**The Architectural Solution:**
- **Hybrid Data Pipeline:** Dual-mode architecture combining a pre-curated, instant-load dataset for benchmark tickers (`NVDA`, `AAPL`, `MSFT`, `AMD`, `GOOGL`, `INTC`, `RELIANCE`, `TCS`, `TATAMOTORS`) with a resilient live fetch pipeline for arbitrary tickers.
- **Graceful Degraded States:** When management guidance or peer comparison datasets are absent in live mode, the UI explicitly flags reduced scope (`LIVE MODE — LIMITED EVIDENCE`) rather than hallucinating fallback metrics.
- **Fault-Tolerant Retries & Model Fallbacks:** Strict fetch timeouts ($8\text{s}$) with fallback error boundaries. For LLM generation, transient model rate limits or 503 spikes automatically retry with fallback models (`gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.5-flash`) before gracefully degrading to deterministic debate generation.
- **Resilient Dual-Adapter Persistence:** Relational repository implementation automatically fails over from Turso Cloud to local SQLite if cloud credentials are misconfigured or unreachable, preserving API service availability.

---

### Phase 4: Transparency & Verification Audit Layer

**The Challenge:** AI financial tools often present LLM summaries as objective truth. If an LLM fabricates a citation or hallucinates an argument, the user has no way of knowing.

**The Architectural Solution:**
- **Adversarial Debate Engine:** A tri-agent framework where a **Bull Agent** and **Bear Agent** compete to interpret verified findings, monitored by an impartial **Judge Agent** that highlights unresolved financial risks.
- **3-Surface Verification Gate:** Every generated Finding, Claim Check, and Debate argument passes through an automated verification barrier (`verification.ts`). Any statement referencing an unverified fact or invalid citation URL is purged before rendering.
- **Audit Drawer UI & Segregated Telemetry:** Real-time visual header badge (`X items removed by citation verification`) and an audit modal drawer allowing users to inspect discarded claims and rejection logs, segregated cleanly between production filing audits and adversarial attack simulations.
- **Attack Center with Mutation Authorization:** Built-in adversarial injection center to test citation verification resistance against fabricated IDs, cross-company tampering, numeric drift, and sign-flip manipulations, protected by endpoint authorization (`API_SECRET_KEY`) in production.

---

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | React 19, Vite, Vanilla CSS | Fast rendering, glassmorphic UI, zero heavy CSS framework overhead |
| **Backend API** | Node.js, Express 5, TypeScript | Type safety across financial domains, async execution, static SPA serving |
| **Database** | SQLite (`better-sqlite3`) & Turso Cloud (`@libsql/client`) | Dual-adapter repository architecture: zero-dependency offline local persistence (SQLite) and hosted cloud persistence (Turso) with automatic local fallback |
| **Data Engine** | Zod, SEC EDGAR XBRL API, BSE / Ind AS | Strict runtime schema enforcement and verified statutory data sources |
| **LLM Orchestration** | Google Gen AI SDK (`@google/genai`) | Constrained Bull/Bear/Judge debate arguments with transient retry and deterministic fallback |
| **Testing** | Vitest 3, Tsx | Comprehensive unit, forensic invariant, integration, security, and production E2E suites |

---

## API Reference

The backend exposes a REST API running on port 3001 (configurable via `PORT`):

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | `GET` | Public | Service health check returning `{ status: "ok", service: "finvestigate-api" }` |
| `/api/health` | `GET` | Public | API health check route alias |
| `/api/investigations/:ticker` | `GET` | Public | Full investigation payload (facts, calculations, anomalies, claim checks, courtroom debate) |
| `/api/verification-stats` | `GET` | Public | Verification audit statistics and rejection telemetry (supports `?ticker=<TICKER>`) |
| `/api/investigations/:ticker/attack` | `POST` | `API_SECRET_KEY` (prod) | Injects adversarial attack scenario (`fabricated_id`, `cross_company`, `numeric_hallucination`, `sign_flip_mismatch`) |

> [!NOTE]
> In production (`NODE_ENV=production`), mutating endpoints (`POST /api/investigations/:ticker/attack`) require authorization via `X-API-Key: <key>` or `Authorization: Bearer <key>`. If `API_SECRET_KEY` is not configured, mutations fail closed with HTTP 503.

---

## Getting Started

### Prerequisites

- Node.js `v18.0.0` or higher
- npm `v9.0.0` or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/Dhanush-Annam/FINVESTIGATE.git
cd FINVESTIGATE

# Install dependencies
npm install
```

> [!NOTE]
> **Native Dependency Note (`better-sqlite3`):** `better-sqlite3` is a native C++ Node module used for local offline development. On fresh clones, npm automatically pulls prebuilt binaries for your platform.

---

## Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Configure variables in `.env` as required for your environment:

| Variable | Description | Required | Default |
|---|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini multi-agent debate synthesis | No (degrades to deterministic fallback) | — |
| `LLM_MODEL` | Primary Gemini model ID for debate agents | No | `gemini-3.5-flash-lite` |
| `SEC_USER_AGENT` | User-Agent header complying with SEC EDGAR fair access policy (`Name email@domain.com`) | No | `"Finvestigate Research contact@finvestigate.dev"` |
| `TURSO_DATABASE_URL` | Turso Cloud libSQL connection URL for cloud persistence | No (falls back to local SQLite) | — |
| `TURSO_AUTH_TOKEN` | Turso Cloud authentication token | Required if `TURSO_DATABASE_URL` is set | — |
| `API_SECRET_KEY` | Shared secret token authorizing mutating attack endpoints | Required for attack execution in production (`NODE_ENV=production`) | — |
| `PORT` | HTTP server listening port | No | `3001` |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) | No | `development` |
| `ALLOWED_ORIGINS` | Comma-separated list of permitted CORS origins | No | `http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000` |

> [!IMPORTANT]
> **Graceful LLM Degradation:** The application functions with **100% test pass rate even if no Gemini API key is provided**. If `GEMINI_API_KEY` is missing, invalid, or rate-limited, the system automatically and gracefully degrades to its deterministic grounding engine (`mode: "deterministic_fallback"`), ensuring zero crashes or blank screens during judging, CI, and offline demos.

---

## Persistence Architecture

FINVESTIGATE implements a repository pattern with dual database adapters:

- **Local Development (Default): SQLite via `better-sqlite3` (`data/finvestigate.db`):** Zero-setup, fully offline-capable persistence layer for local development and CI requiring zero credentials or external network access. Runs in WAL mode with foreign keys enabled, composite primary keys `(run_id, <id>)`, and immutable investigation runs. The local SQLite file is generated at runtime and ignored by Git.
- **Production: Turso Cloud via `@libsql/client`:** Activated automatically when `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are configured. Connects to Turso Cloud (libSQL hosted database in AWS AP South Mumbai) with atomic write batches. If Turso fails to initialize (e.g. invalid credentials or network outage), the repository automatically falls back to local SQLite to preserve availability.
- **Evidence & Reproducibility Fixtures:** The repository retains versioned ground-truth and cache fixtures under `data/cache/` (SEC ticker maps and historical facts), `data/curated/` (pre-verified benchmark company JSONs), and `data/raw/` (cached raw SEC EDGAR XBRL filings).

---

## Running the Application

### Development Mode (Dual Process)

Start the Express backend and the Vite frontend in separate terminal sessions:

```bash
# Terminal 1: Express API backend (Runs on http://localhost:3001)
npm run dev:api

# Terminal 2: Vite React Frontend (Runs on http://localhost:5173)
npm run dev:web
```

### Production Mode (Single Process)

In production, the backend serves both the REST API and the compiled React SPA static assets from `dist/`:

```bash
# 1. Build the frontend SPA and compile the backend TypeScript
npm run build
npm run build:api

# 2. Launch the unified production server
npm start
```

The production server listens on `http://localhost:3001` (or `$PORT`) and serves:
- Static frontend application at `/`
- Backend API at `/api/*`
- Health check endpoints at `/health` and `/api/health`

---

## Available Scripts

| Command | Purpose | Verification Status |
|---|---|---|
| `npm run dev:api` | Starts Express backend in development mode with hot reload via `tsx` | Verified in manifest |
| `npm run dev:web` | Starts Vite React frontend development server | Verified in manifest |
| `npm run build` | Runs TypeScript typecheck and compiles frontend SPA into `dist/` | Verified (Exit Code 0) |
| `npm run build:api` | Compiles server TypeScript into `server-dist/` using `tsconfig.server.json` | Verified (Exit Code 0) |
| `npm start` | Builds API and launches production Node.js server with static SPA serving | Verified in manifest |
| `npm test` | Executes full Vitest test suite (110 tests across 15 test files) | Verified (110/110 passed, Exit Code 0) |
| `npm run test:watch` | Runs Vitest in interactive watch mode | Verified in manifest |
| `npm run test:e2e` | Executes production end-to-end verification suite against live server instance | Verified (11/11 passed, Exit Code 0) |
| `npm run benchmark:llm` | Runs LLM grounding and hallucination benchmark suite | Verified in manifest |
| `npm run typecheck` | Typechecks the entire TypeScript codebase without emitting JS | Verified (Exit Code 0) |

---

## Testing & Verification

FINVESTIGATE maintains an evidence-backed verification suite covering forensic invariants, citation validation, adversarial scenarios, and production deployment readiness:

```bash
# Run complete test suite (110 tests across 15 test files)
npm test

# Run production end-to-end verification suite
npm run test:e2e
```

### Test Suite Organization

- **Forensic Invariant Tests (`tests/forensic/`):** Verifies data consistency across SEC EDGAR XBRL filings, mathematical derivations, citation lineage, and cross-company rejection guards.
- **Integration Tests (`tests/integration/`):** Validates database adapters (SQLite and Turso), evidence store caching, live SEC EDGAR ingestion, and LLM debate orchestration with fallback.
- **Security & Mutation Tests (`tests/security/`):** Tests adversarial attack injection, schema validation, and mutation endpoint authentication rules.
- **Unit Tests (`tests/unit/`):** Validates anomaly detection rules, financial formulas, fundamental scoring, and reference validation.
- **Production E2E Verification (`scripts/verify-prod-e2e.ts`):** Spawns the compiled production server, tests dual health checks, static asset delivery, full ticker retrieval, segregated audit statistics, and mutation authorization enforcement.

---

## Project Structure

```
Finvestigate/
├── src/
│   ├── client/                    # Frontend Single Page Application (React 19, Vite, Vanilla CSS)
│   │   ├── components/            # Modular UI components (DebatePanel, AttackCenter, TrustScoreboard, etc.)
│   │   ├── types/                 # Client UI view models & types
│   │   ├── main.tsx               # React SPA root component & state orchestrator
│   │   └── styles.css             # Vanilla CSS design system & styles
│   ├── server/                    # Backend service layer (Express 5 REST API)
│   │   ├── api/                   # API server entry, static SPA routing, CORS, rate limiting & mutation auth
│   │   ├── application/           # Evidence store & pipeline orchestration services
│   │   ├── domain/                # Financial calculations, findings, scoring & verification gates
│   │   ├── infrastructure/        # External integrations
│   │   │   ├── db/                # Relational DB repositories (SqliteAdapter, TursoAdapter, fallback)
│   │   │   ├── llm/               # Multi-agent courtroom debate orchestrator, agents & fallback
│   │   │   └── sources/           # SEC EDGAR XBRL & BSE/Ind AS statutory ingestion adapters
│   │   └── types/                 # Server domain & DB entity schemas
│   └── shared/                    # Universal cross-tier Zod schemas, constants & utilities
├── data/
│   ├── cache/                     # Cached SEC ticker maps and historical facts (reproducibility fixture)
│   ├── curated/                   # Curated benchmarks (NVDA, AAPL, MSFT, AMD, GOOGL, INTC, RELIANCE, etc.)
│   ├── finvestigate.db            # Local SQLite database (runtime-generated & auto-seeded; git-ignored)
│   └── raw/                       # Cached raw SEC EDGAR XBRL facts (reproducibility fixture)
├── tests/                         # Vitest test suites (110 tests across 15 test files — 100% passing)
│   ├── forensic/                  # Forensic invariant & verification tests (5 files)
│   ├── integration/               # Database (SQLite & Turso), evidence store, EDGAR & LLM integration tests (5 files)
│   ├── security/                  # Adversarial attack API & mutation auth tests (1 file)
│   └── unit/                      # Anomaly rules, calculations & scorer unit tests (4 files)
├── scripts/
│   ├── verify-prod-e2e.ts         # Production end-to-end verification test suite
│   ├── benchmark.ts               # LLM grounding & hallucination benchmarks
│   ├── check-reliance.ts          # BSE statutory verification utility
│   └── reconcile-sources.ts       # Source data reconciliation utility
├── dist/                          # Compiled frontend production assets (git-ignored)
├── server-dist/                   # Compiled backend Node.js production code (git-ignored)
├── docs/                          # Forensic reports, schema audits, and remediation baselines
├── LICENSE                        # MIT License
└── README.md                      # System architecture & evaluation guide
```

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
