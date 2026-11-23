from pydantic import HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    aave_v4_graphql_url: HttpUrl = "https://api.v4.aave.com/graphql"
    database_url: str = "sqlite:///./data/defi_risk.db"
    request_timeout_seconds: float = 15
    risk_utilization_threshold_pct: float = 80


settings = Settings()
