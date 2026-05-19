from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.api import health
from app.config import settings
from app.logging_setup import configure_logging, get_logger
from app.photo_source import create_photo_library_adapter


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger = get_logger(__name__)
    photo_library = create_photo_library_adapter(settings)
    app.state.photo_library = photo_library
    app.state.photo_source = settings.photo_source.value
    logger.info(
        "server.startup",
        phase="scaffolding",
        photo_source=settings.photo_source.value,
    )
    try:
        yield
    finally:
        await photo_library.aclose()
        logger.info("server.shutdown")


app = FastAPI(
    title="Photoframe API",
    version="0.1.0",
    lifespan=lifespan,
)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "OPTIONS"],
        allow_headers=["*"],
    )

app.include_router(health.router)
app.include_router(api_router)
