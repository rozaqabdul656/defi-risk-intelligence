from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from .aave import fetch_hubs
from .config import settings
from .models import Base, HubSnapshot

engine = create_engine(settings.database_url, connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {})
Base.metadata.create_all(engine)
app = FastAPI(title="DeFi Risk Intelligence", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

def serialize(snapshot: HubSnapshot) -> dict:
    observed_at = snapshot.observed_at.replace(tzinfo=timezone.utc) if snapshot.observed_at.tzinfo is None else snapshot.observed_at.astimezone(timezone.utc)
    return {"hubId": snapshot.hub_id, "name": snapshot.hub_name, "chainId": snapshot.chain_id,
            "chain": snapshot.chain_name, "suppliedUsd": snapshot.supplied_usd,
            "borrowedUsd": snapshot.borrowed_usd, "utilizationPct": snapshot.utilization_pct,
            "observedAt": observed_at.isoformat()}

@app.get("/api/v1/health")
def health(): return {"status": "ok", "service": "defi-risk-intelligence"}

@app.get("/api/v1/aave/v4/hubs")
async def hubs(refresh: bool = False):
    if refresh:
        observed_at, rows = await fetch_hubs()
        with Session(engine) as db:
            for hub in rows:
                db.add(HubSnapshot(hub_id=hub.id, hub_name=hub.name, chain_id=hub.chain.chainId, chain_name=hub.chain.name,
                    supplied_usd=float(hub.summary.totalSupplied.current.value), borrowed_usd=float(hub.summary.totalBorrowed.current.value),
                    utilization_pct=float(hub.summary.utilizationRate.normalized), observed_at=observed_at))
            db.commit()
    with Session(engine) as db:
        latest = db.scalars(select(HubSnapshot).order_by(HubSnapshot.observed_at.desc())).all()
    if not latest:
        return {"data": [], "source": "Aave V4 GraphQL", "observation": None, "coverage": "No snapshot collected yet"}
    newest = max(row.observed_at for row in latest)
    rows = [row for row in latest if row.observed_at == newest]
    return {"data": [serialize(row) for row in rows], "source": "Aave V4 GraphQL", "observation": newest.isoformat(), "coverage": f"{len(rows)} hubs in latest stored observation"}

@app.get("/api/v1/analytics/signals")
def signals():
    with Session(engine) as db:
        snapshots = db.scalars(select(HubSnapshot).order_by(HubSnapshot.observed_at.desc())).all()
    if not snapshots: return {"data": [], "methodology": "No stored snapshot"}
    newest = max(row.observed_at for row in snapshots)
    rows = [row for row in snapshots if row.observed_at == newest]
    return {"data": [{"hub": row.hub_name, "severity": "high" if row.utilization_pct >= settings.risk_utilization_threshold_pct else "normal", "metric": "utilization", "valuePct": row.utilization_pct, "thresholdPct": settings.risk_utilization_threshold_pct} for row in rows], "methodology": "High utilization is flagged at a configurable threshold; this is a deterministic signal, not financial advice."}
