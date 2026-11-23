"""Small, typed client for the verified public Aave V4 GraphQL hub query."""
from datetime import datetime, timezone
import asyncio
import httpx
from pydantic import BaseModel, Field
from .config import settings

HUBS_QUERY = """
query Hubs($chainIds: [ChainId!]) {
  hubs(request: { query: { chainIds: $chainIds }, orderBy: { totalSupplied: DESC } }) {
    id name address
    chain { name chainId }
    summary {
      totalSupplied { current { value symbol } }
      totalBorrowed { current { value symbol } }
      utilizationRate { value normalized }
    }
  }
}
"""

class Amount(BaseModel): value: str
class CurrentAmount(BaseModel): current: Amount
class Rate(BaseModel): normalized: str
class Chain(BaseModel): name: str; chainId: int
class HubSummary(BaseModel):
    totalSupplied: CurrentAmount
    totalBorrowed: CurrentAmount
    utilizationRate: Rate
class Hub(BaseModel):
    id: str
    name: str
    address: str
    chain: Chain
    summary: HubSummary
class GraphQLResponse(BaseModel):
    data: dict
    errors: list[dict] | None = None

async def fetch_hubs(chain_ids: list[int] | None = None) -> tuple[datetime, list[Hub]]:
    payload = {"query": HUBS_QUERY, "variables": {"chainIds": chain_ids or [1]}}
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
                response = await client.post(str(settings.aave_v4_graphql_url), json=payload)
                response.raise_for_status()
            body = GraphQLResponse.model_validate(response.json())
            if body.errors:
                raise RuntimeError(f"Aave GraphQL errors: {body.errors}")
            return datetime.now(timezone.utc), [Hub.model_validate(row) for row in body.data["hubs"]]
        except (httpx.HTTPError, ValueError, RuntimeError) as error:
            last_error = error
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)
    raise RuntimeError("Aave V4 request failed after retries") from last_error
