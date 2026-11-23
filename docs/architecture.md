# Architecture notes

`HubSnapshot` stores Hub-level values keyed by the opaque Aave V4 hub id and UTC observation. Spoke data must retain its own opaque spoke id and must never be added to Hub totals: a Hub holds shared liquidity while Spokes configure user-facing lending and risk.

The collector validates the response with Pydantic before persisting it. HTTP and GraphQL failures retry three times with exponential backoff; failed pulls do not overwrite previously collected observations.

The only implemented risk indicator is `high utilization` at the configurable 80% threshold. It is explicitly a model-derived signal and not a measured protocol fact.
