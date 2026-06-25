from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Alert
from app.schemas import AlertRead

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRead])
async def list_alerts(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[Alert]:
    result = await db.execute(select(Alert).order_by(Alert.created_at.desc()).limit(limit))
    return list(result.scalars().all())
