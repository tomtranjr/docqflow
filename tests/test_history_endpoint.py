"""Functional tests for GET /api/history and GET /api/history/{id}."""

from __future__ import annotations

import asyncio


def _seed(rows):
    """Insert the given rows directly via save_classification (bypassing the model)."""
    from src.api.database import save_classification

    async def _go():
        for row in rows:
            await save_classification(**row)

    asyncio.run(_go())


def test_history_pagination_and_filters(client):
    """Seed 5 rows across 2 labels and exercise pagination + label + search filters."""
    _seed(
        [
            {
                "filename": "permit_001.pdf",
                "label": "permit-3-8",
                "confidence": 0.91,
                "probabilities": {"permit-3-8": 0.91, "not-permit-3-8": 0.09},
                "text_preview": "permit text",
                "file_size": 1000,
            },
            {
                "filename": "permit_002.pdf",
                "label": "permit-3-8",
                "confidence": 0.87,
                "probabilities": {"permit-3-8": 0.87, "not-permit-3-8": 0.13},
                "text_preview": "permit text",
                "file_size": 1100,
            },
            {
                "filename": "other_001.pdf",
                "label": "not-permit-3-8",
                "confidence": 0.70,
                "probabilities": {"permit-3-8": 0.30, "not-permit-3-8": 0.70},
                "text_preview": "unrelated text",
                "file_size": 900,
            },
            {
                "filename": "other_002.pdf",
                "label": "not-permit-3-8",
                "confidence": 0.65,
                "probabilities": {"permit-3-8": 0.35, "not-permit-3-8": 0.65},
                "text_preview": "unrelated text",
                "file_size": 950,
            },
            {
                "filename": "permit_003.pdf",
                "label": "permit-3-8",
                "confidence": 0.99,
                "probabilities": {"permit-3-8": 0.99, "not-permit-3-8": 0.01},
                "text_preview": "permit text",
                "file_size": 1200,
            },
        ]
    )

    # pagination
    page1 = client.get("/api/history?page=1&limit=2").json()
    assert page1["total"] == 5
    assert page1["page"] == 1
    assert len(page1["items"]) == 2

    # label filter
    permits = client.get("/api/history?label=permit-3-8").json()
    assert permits["total"] == 3
    assert {item["label"] for item in permits["items"]} == {"permit-3-8"}

    # search filter
    searched = client.get("/api/history?search=other").json()
    assert searched["total"] == 2
    assert all("other" in item["filename"] for item in searched["items"])

    # 404 on missing entry
    assert client.get("/api/history/99999").status_code == 404

    # invalid params rejected
    assert client.get("/api/history?page=0").status_code == 422
    assert client.get("/api/history?limit=101").status_code == 422


def test_history_get_by_id_returns_entry(client):
    """GET /api/history/{id} returns the seeded row with probabilities parsed to a dict."""
    _seed(
        [
            {
                "filename": "single.pdf",
                "label": "permit-3-8",
                "confidence": 0.88,
                "probabilities": {"permit-3-8": 0.88, "not-permit-3-8": 0.12},
                "text_preview": "some preview",
                "file_size": 1234,
            },
        ]
    )

    entry_id = client.get("/api/history").json()["items"][0]["id"]
    response = client.get(f"/api/history/{entry_id}")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["id"] == entry_id
    assert body["filename"] == "single.pdf"
    assert body["label"] == "permit-3-8"
    assert body["confidence"] == 0.88
    assert body["text_preview"] == "some preview"
    assert body["file_size"] == 1234
    # probabilities must be a parsed dict, not the raw JSON string from the DB column.
    assert body["probabilities"] == {"permit-3-8": 0.88, "not-permit-3-8": 0.12}


def test_history_handles_malformed_probabilities_json(client):
    """If the probabilities column contains invalid JSON, routes fall back to {} rather than 500.

    Writes raw garbage directly via SQL to bypass save_classification's json.dumps,
    then hits both /api/history and /api/history/{id} to cover both except branches.
    """
    import aiosqlite

    from src.api.database import DB_PATH

    async def _write_garbage():
        db = await aiosqlite.connect(DB_PATH)
        try:
            await db.execute(
                "INSERT INTO classifications "
                "(filename, label, confidence, probabilities, text_preview, file_size) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                ("broken.pdf", "permit-3-8", 0.5, "{not valid json", "x", 100),
            )
            await db.commit()
        finally:
            await db.close()

    asyncio.run(_write_garbage())

    # List route: must not 500, must return probabilities={} for the bad row.
    list_resp = client.get("/api/history")
    assert list_resp.status_code == 200, list_resp.text
    items = list_resp.json()["items"]
    assert len(items) == 1
    assert items[0]["probabilities"] == {}

    # Detail route: same contract.
    entry_id = items[0]["id"]
    detail_resp = client.get(f"/api/history/{entry_id}")
    assert detail_resp.status_code == 200, detail_resp.text
    assert detail_resp.json()["probabilities"] == {}


def test_history_search_escapes_sql_wildcards(client):
    """LIKE wildcards in the search term must be treated as literals, not matchers.

    The route escapes %, _, and \\ before passing to SQL LIKE ... ESCAPE '\\'.
    Without that escaping, searching "%" would match every filename.
    """
    _seed(
        [
            {
                "filename": "report.pdf",
                "label": "permit-3-8",
                "confidence": 0.9,
                "probabilities": {"permit-3-8": 0.9, "not-permit-3-8": 0.1},
                "text_preview": "x",
                "file_size": 100,
            },
            {
                "filename": "50%_done.pdf",
                "label": "permit-3-8",
                "confidence": 0.9,
                "probabilities": {"permit-3-8": 0.9, "not-permit-3-8": 0.1},
                "text_preview": "x",
                "file_size": 100,
            },
            {
                "filename": "snake_case.pdf",
                "label": "not-permit-3-8",
                "confidence": 0.7,
                "probabilities": {"permit-3-8": 0.3, "not-permit-3-8": 0.7},
                "text_preview": "x",
                "file_size": 100,
            },
        ]
    )

    # "%" must only match filenames literally containing %.
    pct = client.get("/api/history?search=%25").json()
    assert pct["total"] == 1
    assert pct["items"][0]["filename"] == "50%_done.pdf"

    # "_" must only match filenames literally containing _, not any single char.
    underscore = client.get("/api/history?search=_").json()
    assert underscore["total"] == 2
    assert {item["filename"] for item in underscore["items"]} == {
        "50%_done.pdf",
        "snake_case.pdf",
    }

    # Sanity: a normal substring still works.
    report = client.get("/api/history?search=report").json()
    assert report["total"] == 1
    assert report["items"][0]["filename"] == "report.pdf"
