"""GCS-backed PDF storage keyed by SHA-256.

Layout: ``gs://{GCS_BUCKET}/originals/{sha256}.pdf``. Uploads are skip-if-exists
so re-processing the same PDF doesn't burn bandwidth. Tests monkeypatch
``upload_pdf_if_absent`` rather than the GCS SDK to keep the test path
SDK-free.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

from src.api.config import load_settings

if TYPE_CHECKING:
    from google.cloud.storage import Client

log = logging.getLogger(__name__)

_HEX64 = re.compile(r"^[0-9a-f]{64}$")
# GCS bucket name rules (simplified): lowercase letters, digits, dashes,
# underscores, dots; 3–63 chars. We only need to block path-injection chars.
_BUCKET_NAME = re.compile(r"^[a-z0-9][a-z0-9._-]{1,62}$")

_client: Client | None = None


def _validate_sha256(sha256: str) -> None:
    if not _HEX64.fullmatch(sha256):
        raise ValueError(f"invalid sha256: {sha256!r}")


def _validate_bucket(bucket: str) -> None:
    if not bucket:
        raise RuntimeError("GCS_BUCKET not configured")
    if not _BUCKET_NAME.fullmatch(bucket):
        raise ValueError(f"invalid GCS bucket name: {bucket!r}")


def init_client() -> Client:
    """Create the GCS client once during app lifespan and cache it."""
    global _client
    if _client is not None:
        return _client
    from google.cloud import storage

    settings = load_settings()
    _client = storage.Client(project=settings.gcp_project or None)
    log.info("gcs client initialized project=%s", settings.gcp_project)
    return _client


def get_client() -> Client:
    if _client is None:
        raise RuntimeError("GCS client not initialized — did the FastAPI lifespan run?")
    return _client


def reset_client_for_tests() -> None:
    """Clear the cached client; tests use this to avoid leaking SDK state."""
    global _client
    _client = None


def gcs_path_for(sha256: str) -> str:
    """Return the canonical GCS URI for a PDF blob, without touching the network.

    Validates ``sha256`` and the configured bucket name so callers can never
    produce a URI like ``gs:///originals/../foo`` even if env or input is bad.
    """
    settings = load_settings()
    _validate_sha256(sha256)
    _validate_bucket(settings.gcs_bucket)
    return f"gs://{settings.gcs_bucket}/originals/{sha256}.pdf"


def upload_pdf_if_absent(sha256: str, data: bytes) -> str:
    """Upload bytes to ``originals/{sha256}.pdf`` if the blob doesn't already exist.

    Returns the canonical ``gs://{bucket}/originals/{sha}.pdf`` URI either way so
    callers can persist a stable path regardless of whether this upload was a
    no-op. Raises if the GCS client isn't initialized — callers should rely on
    app lifespan.
    """
    _validate_sha256(sha256)
    if not data:
        raise ValueError("cannot upload empty PDF data")
    settings = load_settings()
    _validate_bucket(settings.gcs_bucket)
    client = get_client()
    bucket = client.bucket(settings.gcs_bucket)
    blob = bucket.blob(f"originals/{sha256}.pdf")
    if not blob.exists(client=client):
        blob.upload_from_string(data, content_type="application/pdf")
        log.info("uploaded pdf to gcs sha=%s size=%d", sha256, len(data))
    else:
        log.debug("pdf already in gcs sha=%s — skip-if-exists", sha256)
    return f"gs://{settings.gcs_bucket}/originals/{sha256}.pdf"
