from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    location: Mapped[str] = mapped_column(String(128), default="Line A")
    status: Mapped[str] = mapped_column(String(32), default="idle")
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    current_values: Mapped[list["CurrentValue"]] = relationship(back_populates="device")
    telemetry_records: Mapped[list["TelemetryRecord"]] = relationship(back_populates="device")
    alarms: Mapped[list["Alarm"]] = relationship(back_populates="device")


class CurrentValue(Base):
    __tablename__ = "current_values"
    __table_args__ = (UniqueConstraint("device_id", "metric_key", name="uq_current_value_device_metric"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    metric_key: Mapped[str] = mapped_column(String(64))
    value_num: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit: Mapped[str] = mapped_column(String(32), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    device: Mapped[Device] = relationship(back_populates="current_values")


class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    metric_key: Mapped[str] = mapped_column(String(64), index=True)
    value_num: Mapped[float | None] = mapped_column(Float, nullable=True)
    value_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit: Mapped[str] = mapped_column(String(32), default="")
    source: Mapped[str] = mapped_column(String(32), default="collector")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    device: Mapped[Device] = relationship(back_populates="telemetry_records")


class Alarm(Base):
    __tablename__ = "alarms"

    id: Mapped[int] = mapped_column(primary_key=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id", ondelete="CASCADE"), index=True)
    level: Mapped[str] = mapped_column(String(32), default="info")
    message: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    device: Mapped[Device] = relationship(back_populates="alarms")


class YujinMapDefinition(Base):
    __tablename__ = "yujin_map_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(4), unique=True, index=True)
    data_type: Mapped[int] = mapped_column(Integer)
    data_length: Mapped[int] = mapped_column(Integer)
    signed: Mapped[bool] = mapped_column(Boolean, default=False)
    default_value: Mapped[str] = mapped_column(String(255), default="")
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    section: Mapped[str] = mapped_column(String(32), index=True)
    source: Mapped[str] = mapped_column(String(128), default="DatabaseHelper.setInsertData()")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    current_value: Mapped["YujinMapValue | None"] = relationship(back_populates="definition")
    history: Mapped[list["YujinMapValueHistory"]] = relationship(back_populates="definition")


class YujinMapValue(Base):
    __tablename__ = "yujin_map_values"

    id: Mapped[int] = mapped_column(primary_key=True)
    definition_id: Mapped[int] = mapped_column(
        ForeignKey("yujin_map_definitions.id", ondelete="CASCADE"), unique=True, index=True
    )
    value_text: Mapped[str] = mapped_column(String(255), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    source: Mapped[str] = mapped_column(String(64), default="seed")

    definition: Mapped[YujinMapDefinition] = relationship(back_populates="current_value")


class YujinMapValueHistory(Base):
    __tablename__ = "yujin_map_value_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    definition_id: Mapped[int] = mapped_column(
        ForeignKey("yujin_map_definitions.id", ondelete="CASCADE"), index=True
    )
    value_text: Mapped[str] = mapped_column(String(255), default="")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    source: Mapped[str] = mapped_column(String(64), default="collector")

    definition: Mapped[YujinMapDefinition] = relationship(back_populates="history")
