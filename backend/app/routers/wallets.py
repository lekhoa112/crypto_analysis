from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Wallet
from app.schemas import WalletCreate, WalletRead, WalletUpdate

router = APIRouter(prefix="/wallets", tags=["wallets"])


@router.get("", response_model=list[WalletRead])
async def list_wallets(db: AsyncSession = Depends(get_db)) -> list[Wallet]:
    result = await db.execute(select(Wallet).order_by(Wallet.created_at.desc()))
    return list(result.scalars().all())


@router.post("", response_model=WalletRead, status_code=status.HTTP_201_CREATED)
async def create_wallet(payload: WalletCreate, db: AsyncSession = Depends(get_db)) -> Wallet:
    address = payload.address.lower()
    existing = await db.execute(select(Wallet).where(Wallet.address == address, Wallet.chain == payload.chain))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Wallet already exists")

    wallet = Wallet(address=address, chain=payload.chain, label=payload.label, is_active=True)
    db.add(wallet)
    await db.commit()
    await db.refresh(wallet)
    return wallet


@router.patch("/{wallet_id}", response_model=WalletRead)
async def update_wallet(wallet_id: UUID, payload: WalletUpdate, db: AsyncSession = Depends(get_db)) -> Wallet:
    wallet = await db.get(Wallet, wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    if payload.label is not None:
        wallet.label = payload.label
    if payload.is_active is not None:
        wallet.is_active = payload.is_active

    await db.commit()
    await db.refresh(wallet)
    return wallet


@router.delete("/{wallet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_wallet(wallet_id: UUID, db: AsyncSession = Depends(get_db)) -> None:
    wallet = await db.get(Wallet, wallet_id)
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    await db.delete(wallet)
    await db.commit()
