from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Setting


THRESHOLD_KEY = "alert_threshold_usd"


async def get_alert_threshold(db: AsyncSession) -> float:
    result = await db.execute(select(Setting).where(Setting.key == THRESHOLD_KEY))
    setting = result.scalar_one_or_none()
    if setting:
        return float(setting.value)
    return get_settings().alert_threshold_usd


async def set_alert_threshold(db: AsyncSession, threshold_usd: float) -> float:
    result = await db.execute(select(Setting).where(Setting.key == THRESHOLD_KEY))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = str(threshold_usd)
    else:
        db.add(Setting(key=THRESHOLD_KEY, value=str(threshold_usd)))
    await db.commit()
    return threshold_usd
