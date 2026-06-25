from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import Direction


class WalletCreate(BaseModel):
    address: str = Field(min_length=8, max_length=128)
    chain: str = Field(default="ethereum", max_length=32)
    label: str = Field(min_length=1, max_length=120)


class WalletUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    is_active: bool | None = None


class WalletRead(BaseModel):
    id: UUID
    address: str
    chain: str
    label: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class TransactionWebhook(BaseModel):
    tx_hash: str
    chain: str = "ethereum"
    wallet_address: str
    token_symbol: str = "ETH"
    token_address: str | None = None
    amount: float
    usd_value: float
    direction: Direction = Direction.unknown
    created_at: datetime | None = None


class TransactionRead(BaseModel):
    id: UUID
    tx_hash: str
    chain: str
    wallet_address: str
    token_symbol: str
    token_address: str | None
    amount: float
    usd_value: float
    direction: Direction
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertRead(BaseModel):
    id: UUID
    transaction_id: UUID
    wallet_address: str
    chain: str
    title: str
    message: str
    usd_value: float
    sent_telegram: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SettingRead(BaseModel):
    key: str
    value: str

    model_config = {"from_attributes": True}


class ThresholdUpdate(BaseModel):
    threshold_usd: float = Field(ge=0)


class ThresholdRead(BaseModel):
    threshold_usd: float
