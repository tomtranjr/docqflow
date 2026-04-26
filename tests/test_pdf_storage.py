"""Tests for the filesystem PDF storage helper."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest

from src.api.pdf_storage import compute_sha256, pdf_path, read_pdf, save_pdf


def test_compute_sha256_is_deterministic():
    data = b"hello world"
    expected = hashlib.sha256(data).hexdigest()
    assert compute_sha256(data) == expected


def test_save_pdf_writes_bytes_at_sha_path(tmp_path: Path):
    data = b"%PDF-1.7 fake"
    sha = compute_sha256(data)
    save_pdf(data, sha, dir_path=str(tmp_path))
    assert (tmp_path / f"{sha}.pdf").read_bytes() == data


def test_save_pdf_is_idempotent_for_same_sha(tmp_path: Path):
    data = b"%PDF-1.7"
    sha = compute_sha256(data)
    save_pdf(data, sha, dir_path=str(tmp_path))
    save_pdf(data, sha, dir_path=str(tmp_path))
    pdfs = list(tmp_path.glob("*.pdf"))
    assert len(pdfs) == 1


def test_read_pdf_returns_bytes(tmp_path: Path):
    data = b"%PDF-1.7 hello"
    sha = compute_sha256(data)
    save_pdf(data, sha, dir_path=str(tmp_path))
    assert read_pdf(sha, dir_path=str(tmp_path)) == data


def test_read_pdf_raises_filenotfound(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        read_pdf("missing", dir_path=str(tmp_path))


def test_pdf_path_returns_correct_path(tmp_path: Path):
    p = pdf_path("abc", dir_path=str(tmp_path))
    assert p == str(tmp_path / "abc.pdf")
