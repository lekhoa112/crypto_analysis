from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import websocket_manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/alerts")
async def alerts_websocket(websocket: WebSocket) -> None:
    await websocket_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
