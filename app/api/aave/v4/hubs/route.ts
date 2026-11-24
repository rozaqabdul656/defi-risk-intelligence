import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const endpoint = "https://api.v4.aave.com/graphql";
const query = `query Hubs($chainIds: [ChainId!]) { hubs(request: { query: { chainIds: $chainIds }, orderBy: { totalSupplied: DESC } }) { id name chain { name chainId } summary { totalSupplied { current { value } } totalBorrowed { current { value } } utilizationRate { normalized } } } }`;

type HubResponse = { data?: { hubs?: Array<{ id: string; name: string; chain: { name: string; chainId: number }; summary: { totalSupplied: { current: { value: string } }; totalBorrowed: { current: { value: string } }; utilizationRate: { normalized: string } } }> }; errors?: unknown[] };

export async function GET() {
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables: { chainIds: [1] } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
    if (!upstream.ok) throw new Error(`Aave upstream returned ${upstream.status}`);
    const result = await upstream.json() as HubResponse;
    if (result.errors?.length || !result.data?.hubs) throw new Error("Aave V4 returned an invalid hub response");
    return NextResponse.json({
      source: "Aave V4 GraphQL",
      observedAt: new Date().toISOString(),
      coverage: "Ethereum · chain ID 1 · live upstream response",
      hubs: result.data.hubs.map((hub) => ({
        hubId: hub.id, name: hub.name, chain: hub.chain.name, chainId: hub.chain.chainId,
        suppliedUsd: Number(hub.summary.totalSupplied.current.value),
        borrowedUsd: Number(hub.summary.totalBorrowed.current.value),
        utilizationPct: Number(hub.summary.utilizationRate.normalized)
      }))
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    return NextResponse.json({ error: "Live Aave V4 data is temporarily unavailable", detail: error instanceof Error ? error.message : "Unknown upstream error" }, { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
