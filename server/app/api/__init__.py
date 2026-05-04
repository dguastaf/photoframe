"""HTTP API package: `/api` root, versioned under `/api/v0`, etc."""

from fastapi import APIRouter

from app.api.v0 import v0_router

api_router = APIRouter(prefix="/api")
api_router.include_router(v0_router, prefix="/v0")

__all__ = ["api_router"]
