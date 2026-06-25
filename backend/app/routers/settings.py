from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas import ThresholdRead, ThresholdUpdate
from app.services.settings import get_alert_threshold, set_alert_threshold

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/threshold", response_model=ThresholdRead)
async def read_threshold(db: AsyncSession = Depends(get_db)) -> ThresholdRead:
    return ThresholdRead(threshold_usd=await get_alert_threshold(db))


@router.put("/threshold", response_model=ThresholdRead)
async def update_threshold(payload: ThresholdUpdate, db: AsyncSession = Depends(get_db)) -> ThresholdRead:
    threshold = await set_alert_threshold(db, payload.threshold_usd)
    return ThresholdRead(threshold_usd=threshold)
