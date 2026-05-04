from fastapi import APIRouter

from app.api.v0 import photos

v0_router = APIRouter()
v0_router.include_router(photos.router)

__all__ = ["v0_router"]
