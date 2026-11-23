# DeFi Risk Intelligence

Read-only Aave V4 liquidity and risk intelligence by **mcClabe**. The MVP focuses on accurate Hub-level accounting: liquidity is displayed at its shared accounting layer and is never summed across Spokes.

## What works now

- A premium static research terminal with a verified live Aave V4 snapshot.
- A typed FastAPI collector for the public Aave V4 GraphQL API.
- Hub-level supplied liquidity, borrows, utilization, coverage and UTC observation time.
- Retry/backoff, GraphQL error handling, timestamped relational snapshots and a deterministic utilization signal.
- Client-side 1920×1080 research PNG export which identifies the source and observation time.
- Docker configuration and a minimal automated threshold test.

## Data correctness

The collector uses `hubs(request: { query: { chainIds }, orderBy })` and reads `HubSummary.totalSupplied.current`, `totalBorrowed.current`, and `utilizationRate.normalized`. These fields were introspected and queried from the official public endpoint on 2026-11-23. All financial values on the landing dashboard come from that successful response; the initial snapshot is explicitly identified with chain scope and observation time.

Unavailable metrics are omitted rather than estimated. The system does not show a 24-hour change until two comparable stored observations exist. The static deployment visualizes an included verified snapshot; run the local API and click **Refresh data** to collect fresh values.

## Architecture

```text
Aave V4 public GraphQL
          │  HTTPX + validated Pydantic response + exponential backoff
          ▼
 FastAPI collector ──► SQLAlchemy HubSnapshot rows ──► read-only REST
          │                                              │
          └── deterministic utilization threshold ───────┘
                                                         ▼
                                      dashboard + exportable PNG
```

## Run locally

```bash
docker compose up --build
# collect a new UTC observation
curl 'http://localhost:8000/api/v1/aave/v4/hubs?refresh=true'
```

Open `dist/index.html` with a static server. It renders the verified snapshot without a local API, and uses the API when the **Refresh data** action is selected.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/health` | Service health |
| `GET /api/v1/aave/v4/hubs` | Latest stored hub observation |
| `GET /api/v1/aave/v4/hubs?refresh=true` | Fetch, validate and persist a fresh observation |
| `GET /api/v1/analytics/signals` | Deterministic utilization indicators |

## Known limitations and roadmap

- The current collector is Ethereum-scoped by default, so coverage is made explicit in every response.
- Scheduled 15-minute collection belongs in the deployment scheduler; overlapping jobs should be guarded with a distributed lock when PostgreSQL is introduced.
- Hub/spoke asset configuration, historical snapshots, multi-chain coverage and Morpho adapters are the next milestones.
- The public endpoint can change; the query is intentionally isolated in `backend/app/aave.py` with typed models to make schema drift visible.

## Engineering notes

This MVP intentionally has no wallet connection, signing, lending or borrowing execution. It is designed as a transparent research tool, not financial advice.
