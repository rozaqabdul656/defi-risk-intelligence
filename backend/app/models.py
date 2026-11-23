from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class HubSnapshot(Base):
    __tablename__ = "hub_snapshots"
    __table_args__ = (UniqueConstraint("hub_id", "observed_at", name="uq_hub_observation"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    hub_id: Mapped[str] = mapped_column(String(256), index=True)
    hub_name: Mapped[str] = mapped_column(String(100))
    chain_id: Mapped[int] = mapped_column(Integer, index=True)
    chain_name: Mapped[str] = mapped_column(String(100))
    supplied_usd: Mapped[float] = mapped_column(Float)
    borrowed_usd: Mapped[float] = mapped_column(Float)
    utilization_pct: Mapped[float] = mapped_column(Float)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
