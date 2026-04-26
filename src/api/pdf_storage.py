"""Filesystem-backed PDF storage keyed by SHA-256."""

from __future__ import annotations

import hashlib
import os

from src.api.config import load_settings


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_path(sha256: str, dir_path: str | None = None) -> str:
    base = dir_path or load_settings().pdf_dir
    return os.path.join(base, f"{sha256}.pdf")


def save_pdf(data: bytes, sha256: str, dir_path: str | None = None) -> str:
    base = dir_path or load_settings().pdf_dir
    os.makedirs(base, exist_ok=True)
    path = pdf_path(sha256, dir_path=base)
    if os.path.exists(path):
        return path  # idempotent
    with open(path, "wb") as f:
        f.write(data)
    return path


def read_pdf(sha256: str, dir_path: str | None = None) -> bytes:
    with open(pdf_path(sha256, dir_path=dir_path), "rb") as f:
        return f.read()
