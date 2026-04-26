import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from classify import load_model
from src.api.config import load_settings
from src.api.database import init_db

_pipeline = None


def get_pipeline():
    return _pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _pipeline
    _pipeline = load_model()
    await init_db()
    settings = load_settings()
    os.makedirs(settings.pdf_dir, exist_ok=True)
    yield


app = FastAPI(title="DocQFlow", lifespan=lifespan)

from app import router as classify_router  # noqa: E402
from src.api.routes import router as api_router  # noqa: E402

app.include_router(classify_router, prefix="/api")
app.include_router(api_router, prefix="/api")

dist_dir = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(dist_dir):
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")
