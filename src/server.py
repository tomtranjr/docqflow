import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.api.config import load_settings
from src.api.database import init_db
from src.api.routes import router as api_router
from src.classifier import load_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pipeline = load_model()
    await init_db()
    settings = load_settings()
    os.makedirs(settings.pdf_dir, exist_ok=True)
    yield


app = FastAPI(title="DocQFlow", lifespan=lifespan)
app.include_router(api_router, prefix="/api")

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dist_dir = os.path.join(REPO_ROOT, "frontend", "dist")
if os.path.isdir(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
