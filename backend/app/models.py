import enum
from datetime import datetime
from uuid import UUID as PyUUID
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Direction(str, enum.Enum):
    incoming = "incoming"
    outgoing = "outgoing"
    unknown = "unknown"


class User(Base):
    __tablename__ = "users"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    role: Mapped[str] = mapped_column(String(40), default="user", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True, nullable=False)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(back_populates="user")
    security_logs: Mapped[list["SecurityLog"]] = relationship(back_populates="user")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replaced_by_token_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    user: Mapped[User] = relationship(back_populates="password_reset_tokens")


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    event_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True, nullable=False)

    user: Mapped[User | None] = relationship(back_populates="security_logs")


class Wallet(Base):
    __tablename__ = "whale_wallets"
    __table_args__ = (UniqueConstraint("address", "chain", name="uq_whale_wallet_address_chain"),)

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    address: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    chain: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="wallet")


class Transaction(Base):
    __tablename__ = "whale_transactions"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    tx_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    chain: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    wallet_address: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    wallet_id: Mapped[PyUUID | None] = mapped_column(
        "whale_wallet_id",
        UUID(as_uuid=True),
        ForeignKey("whale_wallets.id"),
        nullable=True,
    )
    token_symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    token_address: Mapped[str | None] = mapped_column(String(128), nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    usd_value: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    direction: Mapped[Direction] = mapped_column(Enum(Direction, name="tx_direction"), default=Direction.unknown, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True, nullable=False)
    raw_payload: Mapped[str | None] = mapped_column(Text, nullable=True)

    wallet: Mapped[Wallet | None] = relationship(back_populates="transactions")
    alert: Mapped["Alert | None"] = relationship(back_populates="transaction")


class Alert(Base):
    __tablename__ = "whale_alerts"

    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    transaction_id: Mapped[PyUUID] = mapped_column(
        "whale_transaction_id",
        UUID(as_uuid=True),
        ForeignKey("whale_transactions.id"),
        nullable=False,
    )
    wallet_address: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    chain: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    usd_value: Mapped[float] = mapped_column(Float, index=True, nullable=False)
    sent_telegram: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True, nullable=False)

    transaction: Mapped[Transaction] = relationship(back_populates="alert")


class Setting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
