"""Supabase JWT auth dependency for FastAPI routes.

Verifies tokens with HS256 against ``SUPABASE_JWT_SECRET`` (Supabase's default).
Returns ``auth.uid()`` (the ``sub`` claim parsed as ``UUID``) so the route can
attribute uploads to the calling user. Tests bypass JWT verification entirely
via ``app.dependency_overrides[get_current_user_id]``.
"""

from __future__ import annotations

import logging
from typing import Annotated
from uuid import UUID

import jwt as pyjwt
from fastapi import Header, HTTPException, status

from src.api.config import load_settings

log = logging.getLogger(__name__)


# Temporary (docqflow-h39): fixed UUID returned when DOCQFLOW_DISABLE_AUTH is on.
# All anonymous requests are attributed to this user so POST/GET round-trips
# resolve the same pipeline_runs row. Delete this constant and the early
# return below once the frontend Supabase Auth flow lands.
_DEV_USER_ID = UUID("00000000-0000-0000-0000-00000000d0c0")


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> UUID:
    """Validate the bearer token and return the user's UUID (``auth.uid()``).

    401 on missing / malformed / expired / forged tokens. 500 if the JWT secret
    is not configured — that's a deployment misconfiguration, not a client bug.

    Temporary bypass (docqflow-h39): when ``DOCQFLOW_DISABLE_AUTH=true`` is set
    on the deployment, returns a fixed dev UUID without inspecting the header.
    Lets the Review page work while the frontend Supabase Auth flow is built.
    """
    if load_settings().disable_auth:
        return _DEV_USER_ID
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = load_settings()
    if not settings.supabase_jwt_secret:
        log.error("SUPABASE_JWT_SECRET is not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth not configured on this server",
        )

    try:
        claims = pyjwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except pyjwt.PyJWTError as exc:
        # Log details server-side so we can debug; return a generic message
        # to the client so we don't leak which JWT validation step tripped.
        log.warning("rejecting JWT: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    sub = claims.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return UUID(str(sub))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Subject claim is not a valid UUID",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
