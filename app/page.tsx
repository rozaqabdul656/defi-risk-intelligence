"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Hub = { hubId: string; name: string; chain: string; chainId: number; suppliedUsd: number; borrowedUsd: number; utilizationPct: number };
type Payload = { source: string; observedAt: string; coverage: string; hubs: Hub[] };
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
const exactMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const percent = (value: number) => `${value.toFixed(1)}%`;

export default function Dashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await fetch("/api/aave/v4/hubs", { cache: "no-store" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Live data unavailable"); setData(body); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Live data unavailable"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const totals = useMemo(() => ({ supplied: data?.hubs.reduce((sum, hub) => sum + hub.suppliedUsd, 0) ?? 0, borrowed: data?.hubs.reduce((sum, hub) => sum + hub.borrowedUsd, 0) ?? 0 }), [data]);
  const utilization = totals.supplied ? totals.borrowed / totals.supplied * 100 : 0;
  const hubs = useMemo(() => [...(data?.hubs ?? [])].sort((a, b) => b.suppliedUsd - a.suppliedUsd), [data]);
  return <main>
    <header><div className="brand">◈ mc<span>Clabe</span><small>RESEARCH TERMINAL</small></div><nav><a href="#overview">Overview</a><a href="#markets">Markets</a><a href="#method">Methodology</a></nav><button onClick={() => void load()} disabled={loading}>{loading ? "● FETCHING" : "● LIVE DATA"}</button></header>
    <section className="hero" id="overview"><div><p className="eyebrow">AAVE V4 / REAL-TIME / READ-ONLY</p><h1>Liquidity, not illusions.</h1><p>Live Hub-level liquidity and risk intelligence direct from Aave V4. This dashboard never substitutes static numbers when the upstream source fails.</p></div><aside><b><i />{error ? "Upstream unavailable" : "Live upstream response"}</b><span>{error ?? (data ? `Fetched ${new Date(data.observedAt).toUTCString()}` : "Connecting to Aave V4…")}</span></aside></section>
    <section className="metrics"><Metric label="Total supplied" value={data ? money(totals.supplied) : "—"} detail="Hub-level; no spoke double-counting"/><Metric label="Outstanding borrows" value={data ? money(totals.borrowed) : "—"} detail="Live upstream response"/><Metric label="Aggregate utilization" value={data ? percent(utilization) : "—"} detail="Borrowed ÷ supplied"/><Metric label="Active hubs" value={data ? String(data.hubs.length) : "—"} detail={data?.coverage ?? "Connecting"}/></section>
    <section className="grid" id="markets"><article className="panel"><div className="head"><div><p className="eyebrow">HUB LIQUIDITY MAP</p><h2>Supplied vs borrowed</h2></div><small><i className="teal"/> Supplied <i className="amber"/> Borrowed</small></div><LiquidityChart hubs={hubs} source={data?.source} observedAt={data?.observedAt} coverage={data?.coverage}/></article><article className="panel"><p className="eyebrow">ACCOUNTING MODEL</p><h2>Hub &amp; spoke</h2><span className="illustrative">ILLUSTRATIVE · TOPOLOGY PENDING</span><div className="model"><div className="root">Aave V4<small>shared liquidity</small></div><div className="orb o1">Core</div><div className="orb o2">Sentora</div><div className="orb o3">Prime</div><p>Illustrative only: actual Hub ↔ Spoke topology will appear when its verified API mapping is integrated. Hub balances are counted once.</p></div></article></section>
    <section className="panel table"><div className="head"><div><p className="eyebrow">MARKET COVERAGE</p><h2>Observed V4 hubs</h2></div><small>{data ? `LIVE ${new Date(data.observedAt).toISOString()}` : "—"}</small></div><table><thead><tr><th>Hub</th><th>Network</th><th>Total supplied</th><th>Total borrowed</th><th>Utilization</th><th>Risk signal</th></tr></thead><tbody>{data?.hubs.map((hub) => <tr key={hub.hubId}><td><b>{hub.name}</b></td><td>{hub.chain}</td><td>{money(hub.suppliedUsd)}</td><td>{money(hub.borrowedUsd)}</td><td>{percent(hub.utilizationPct)}</td><td className={hub.utilizationPct >= 80 ? "high" : "normal"}>{hub.utilizationPct >= 80 ? "HIGH UTILIZATION" : "WITHIN THRESHOLD"}</td></tr>)}</tbody></table></section>
    <section className="method" id="method"><div><p className="eyebrow">SIGNAL DISCIPLINE</p><h2>Measured data stays separate from judgment.</h2></div><p>High utilization is flagged at ≥80%. The API request is made fresh on every load and refresh. If Aave is unavailable, this screen displays the failure rather than a stale financial number.</p></section><footer>© 2026 mcClabe <span>Read-only · no wallet connection · no financial advice</span></footer>
  </main>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <article><span>{label}</span><strong>{value}</strong><em>{detail}</em></article>; }

function LiquidityChart({ hubs, source, observedAt, coverage }: { hubs: Hub[]; source?: string; observedAt?: string; coverage?: string }) {
  const [activeHub, setActiveHub] = useState<Hub | null>(null);
  const maxValue = Math.max(...hubs.flatMap((hub) => [hub.suppliedUsd, hub.borrowedUsd]), 1);
  const axisMax = Math.ceil(maxValue / 100_000_000) * 100_000_000;
  const ticks = Array.from({ length: 5 }, (_, index) => axisMax * index / 4);
  const width = 760, labelWidth = 135, plotWidth = 590, top = 32, rowHeight = 66, height = top + hubs.length * rowHeight + 35;
  const selected = activeHub ?? hubs[0];
  return <div className="liquidity-chart" onMouseLeave={() => setActiveHub(null)}>
    <div className="chart-tooltip" aria-live="polite">{selected ? <><b>{selected.name}</b><span>Supplied <strong>{exactMoney(selected.suppliedUsd)}</strong></span><span>Borrowed <strong>{exactMoney(selected.borrowedUsd)}</strong></span><span>Utilization <strong>{percent(selected.utilizationPct)}</strong></span></> : <span>Hover a hub for exact values</span>}</div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Horizontal grouped bar chart showing live supplied and borrowed Aave V4 hub liquidity in United States dollars">
      <defs><linearGradient id="supply-gradient" x1="0" x2="1"><stop stopColor="#35e3d0"/><stop offset="1" stopColor="#128076"/></linearGradient><linearGradient id="borrow-gradient" x1="0" x2="1"><stop stopColor="#f3bf6c"/><stop offset="1" stopColor="#aa6b2d"/></linearGradient></defs>
      <text x={labelWidth} y="15" className="svg-title">USD · HUB-LEVEL ACCOUNTING</text>
      {ticks.map((tick) => { const x = labelWidth + tick / axisMax * plotWidth; return <g key={tick}><line x1={x} x2={x} y1={top - 6} y2={height - 28} className="grid-line"/><text x={x} y={height - 9} className="axis-label" textAnchor="middle">{exactMoney(tick)}</text></g>; })}
      {hubs.map((hub, index) => { const y = top + index * rowHeight; const suppliedWidth = hub.suppliedUsd / axisMax * plotWidth; const borrowedWidth = hub.borrowedUsd / axisMax * plotWidth; const active = activeHub?.hubId === hub.hubId; return <g key={hub.hubId} className={`chart-row${active ? " is-active" : ""}`} tabIndex={0} role="button" aria-label={`${hub.name}: supplied ${exactMoney(hub.suppliedUsd)}, borrowed ${exactMoney(hub.borrowedUsd)}, utilization ${percent(hub.utilizationPct)}`} onMouseEnter={() => setActiveHub(hub)} onFocus={() => setActiveHub(hub)}><text x={labelWidth - 14} y={y + 23} className="hub-label" textAnchor="end">{hub.name}</text><rect x={labelWidth} y={y + 5} width={suppliedWidth} height="18" rx="4" className="bar-supplied"/><rect x={labelWidth} y={y + 31} width={borrowedWidth} height="11" rx="3" className="bar-borrowed"/><text x={labelWidth + suppliedWidth + 8} y={y + 19} className="bar-value">{money(hub.suppliedUsd)}</text></g>; })}
    </svg>
    <p className="chart-provenance"><span>Source: {source ?? "Awaiting live source"}</span><span>{coverage ?? "Coverage pending"}</span><span>{observedAt ? `Observed ${new Date(observedAt).toISOString()}` : "Observation pending"}</span></p>
  </div>;
}
