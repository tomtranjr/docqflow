import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.api.config import load_settings
from src.api.database import init_db
from src.api.routes import router as api_router
from src.api.routes_pipeline import router as pipeline_router
from src.classifier import load_model
from src.pipeline.gazetteer import Gazetteer
from src.pipeline.llm_profiles import available_profiles

# Surface INFO-level app logs through Cloud Run / docker logs. Uvicorn's default
# log_config only configures the `uvicorn*` loggers, so app loggers (including
# `Gazetteer._build`'s "loaded N gazetteer rows" message) stay silent without this.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    force=True,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = load_settings()
    app.state.pipeline = load_model()
    logger.info("classifier loaded")
    app.state.gazetteer = Gazetteer.load()
    await init_db()
    os.makedirs(settings.pdf_dir, exist_ok=True)
    for info in available_profiles():
        logger.info(
            "llm_profile name=%s provider=%s model=%s reachable=%s",
            info.name,
            info.provider,
            info.model,
            info.reachable,
        )

    # Pipeline prod-swap (docqflow-2qr.2): init Postgres pool + GCS client.
    # Both are best-effort during startup so the legacy classifier endpoints
    # still come up if Postgres / GCS are misconfigured locally — pipeline
    # routes will surface the misconfiguration via 5xx instead of refusing
    # to boot.
    if settings.database_url:
        from src.api.postgres import init_pool

        try:
            await init_pool()
            logger.info("postgres pool initialized")
        except Exception:
            logger.exception("failed to init postgres pool")
    else:
        logger.warning("DATABASE_URL not set — pipeline persistence disabled")

    if settings.gcs_bucket:
        from src.api.gcs_storage import init_client

        try:
            init_client()
        except Exception:
            logger.exception("failed to init gcs client")
    else:
        logger.warning("GCS_BUCKET not set — pipeline upload disabled")

    try:
        yield
    finally:
        if settings.database_url:
            from src.api.postgres import close_pool

            try:
                await close_pool()
            except Exception:
                logger.exception("failed to close postgres pool")


app = FastAPI(title="DocQFlow", lifespan=lifespan)

# CORS for the separate Vercel frontend origin. Same-origin static-served
# frontend (mounted below) doesn't need this, but cross-origin browser
# clients (Vercel preview / prod, local Vite dev server) do.
_settings = load_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_settings.cors_allowed_origins),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(api_router, prefix="/api")
app.include_router(pipeline_router, prefix="/api")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist_dir = os.path.join(REPO_ROOT, "frontend", "dist")
if os.path.isdir(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
