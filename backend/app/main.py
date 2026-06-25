from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import alerts, auth, settings, wallets, webhooks, ws

settings_obj = get_settings()

app = FastAPI(title=settings_obj.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_obj.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(wallets.router)
app.include_router(alerts.router)
app.include_router(settings.router)
app.include_router(webhooks.router)
app.include_router(ws.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
