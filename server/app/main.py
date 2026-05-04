from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import api_router
from app.api import health
from app.logging_setup import configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    logger = get_logger(__name__)
    logger.info("server.startup", phase="scaffolding")
    # TODO(phase-2): construct PhotoprismAdapter here and stash on app.state.
    try:
        yield
    finally:
        logger.info("server.shutdown")


app = FastAPI(
    title="Photoframe API",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(api_router)
