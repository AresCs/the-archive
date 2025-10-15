# backend/auth.py
from __future__ import annotations
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Literal, Tuple

import jwt
from fastapi import HTTPException, Request

# ==== Config ====
SECRET_KEY = os.getenv("ARCHIVE_SECRET_KEY", "dev-only-change-me")
ALGO = "HS256"
SESSION_COOKIE = "archive_session"
SESSION_TTL = timedelta(hours=8)

Clearance = Literal["Minimal", "Restricted", "Operational", "TopSecret", "Redline"]

CLEARANCE_ORDER = {
    "Minimal": 0,
    "Restricted": 1,
    "Operational": 2,
    "TopSecret": 3,
    "Redline": 4,
}

def clearance_at_least(user: Dict[str, Any], required: Clearance) -> bool:
    u = (user or {}).get("clearance") or "Minimal"
    return CLEARANCE_ORDER.get(str(u), -1) >= CLEARANCE_ORDER[required]

def make_session(user: Dict[str, Any]) -> str:
    payload = {
        "sub": user.get("id"),
        "username": user.get("username"),
        "clearance": user.get("clearance", "Minimal"),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + SESSION_TTL,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGO)

def parse_session(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, detail="Session expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, detail="Invalid session")

def read_user_from_request(request: Request) -> Optional[Dict[str, Any]]:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        # Support Authorization: Bearer <token> for tooling/tests
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    return parse_session(token)

def require_clearance(request: Request, level: Clearance) -> Dict[str, Any]:
    user = read_user_from_request(request)
    if not user:
        raise HTTPException(401, detail="Not authenticated")
    if not clearance_at_least(user, level):
        raise HTTPException(403, detail="Insufficient clearance")
    return user

def record_required_clearance(record: Dict[str, Any]) -> Clearance:
    """
    Normalize per-record classification -> required min clearance.
    Priority:
      1) record['classification'] in {"Minimal","Confidential","Restricted","Classified","Operational","Top Secret","TopSecret","Redline"}
      2) people: 'internal_flags' includes "Person of Interest" -> Restricted
      3) default -> Minimal
    """
    # (Intel) explicit classification present?
    cls = str(record.get("classification", "")).strip()
    if cls:
        normalized = cls.replace(" ", "")
        mapping = {
            "Minimal": "Minimal",
            "Confidential": "Restricted",
            "Restricted": "Restricted",
            "Classified": "Operational",
            "Operational": "Operational",
            "TopSecret": "TopSecret",
            "Top": "TopSecret",  # if someone wrote "Top Secret" split
            "Redline": "Redline",
        }
        # special case "Top Secret" with space:
        if cls.lower() == "top secret":
            return "TopSecret"
        return mapping.get(normalized, "Restricted")

    # (People) POI flag bumps to Restricted
    flags = [f.lower() for f in (record.get("internal_flags") or [])]
    if "person of interest".lower() in flags:
        return "Restricted"

    return "Minimal"

def can_view_record(user: Dict[str, Any], record: Dict[str, Any]) -> bool:
    need = record_required_clearance(record)
    return clearance_at_least(user, need)
