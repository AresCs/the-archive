from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, TypedDict

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

# ACL / Session helpers (make sure backend/auth.py exists with these)
from auth import (
    make_session,
    read_user_from_request,
    require_clearance,
    can_view_record,
    SESSION_COOKIE,
)

# ========= Paths / storage =========
ROOT = Path(__file__).parent
AGENTS_PATH = ROOT / "agents.json"
PEOPLE_PATH = ROOT / "people.json"
INTEL_PATH = ROOT / "inteldata.json"

# ========= Types =========
class AgentRecord(TypedDict, total=False):
    id: str               # zero-padded string ok ("001") or plain "1"
    name: str
    username: str
    password: str         # NOTE: plaintext for demo only
    rank: str
    clearance: str
    createdBy: str
    createdAt: str
    lastActive: str
    # Optional RP fields (ignored by API logic but kept if present)
    badgeNumber: str
    callSign: str
    unit: str
    division: str
    onDuty: bool
    lastDutyChange: str

class PersonRecord(TypedDict, total=False):
    id: int
    full_name: str
    known_aliases: List[str]
    dob: str
    gender: str
    nationality: str
    current_address: str
    gang_affiliation: str
    known_associates: List[str]
    organization_ties: List[str]
    recent_contacts: List[str]
    suspected_informant: str
    known_vehicles: List[str]
    tracked_devices: List[str]
    radio_frequencies: List[str]
    recent_movements: List[str]
    cctv_snapshots: List[str]
    intercepted_audio: List[str]
    blackmail_material: str
    created_by: str
    last_updated: str
    access_level: str
    image_url: str
    internal_flags: List[str]
    linked_reports: List[str]

class IntelRecord(TypedDict, total=False):
    id: int
    title: str
    summary: str
    linked_persons: List[str]
    linked_reports: List[str]
    operation_code: str
    status: str
    source: str
    collection_method: str
    classification: str
    linked_organizations: List[str]
    linked_operations: List[str]
    created_by: str
    last_updated: str
    # (present in some UIs but optional)
    incident_date: str
    location: Any
    attachments: Any

# ========= Helpers =========
def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"

def _today_str() -> str:
    return datetime.utcnow().date().isoformat()

def _ensure_file(path: Path, default: Any) -> None:
    if not path.exists():
        path.write_text(json.dumps(default, indent=2), encoding="utf-8")

def _load_json(path: Path, default: Any) -> Any:
    _ensure_file(path, default)
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def _save_json(path: Path, data: Any) -> None:
    tmp = path.with_suffix(".tmp.json")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)

def _normalize_id_str(x: Any) -> str:
    """Normalize '001', '1', 1 -> '1' for comparisons."""
    s = str(x).strip()
    if s.isdigit():
        return str(int(s))
    return s

def load_agents() -> List[AgentRecord]:
    data = _load_json(AGENTS_PATH, [])
    return list(data.values()) if isinstance(data, dict) else data

def save_agents(data: List[AgentRecord]) -> None:
    _save_json(AGENTS_PATH, data)

def load_people() -> List[PersonRecord]:
    data = _load_json(PEOPLE_PATH, [])
    return list(data.values()) if isinstance(data, dict) else data

def save_people(data: List[PersonRecord]) -> None:
    _save_json(PEOPLE_PATH, data)

def load_intel() -> List[IntelRecord]:
    data = _load_json(INTEL_PATH, [])
    return list(data.values()) if isinstance(data, dict) else data

def save_intel(data: List[IntelRecord]) -> None:
    _save_json(INTEL_PATH, data)

def _next_person_id(people: List[PersonRecord]) -> int:
    max_id = 0
    for p in people:
        try:
            v = int(p.get("id", 0))
            if v > max_id:
                max_id = v
        except Exception:
            continue
    return max_id + 1

def _next_intel_id(intels: List[IntelRecord]) -> int:
    max_id = 0
    for r in intels:
        try:
            v = int(r.get("id", 0))
            if v > max_id:
                max_id = v
        except Exception:
            continue
    return max_id + 1

def _public_agent(agent: AgentRecord) -> AgentRecord:
    a = dict(agent)
    a.pop("password", None)
    return a  # type: ignore[return-value]

def _matches_query(person: PersonRecord, q: str) -> bool:
    """Loose match across useful fields."""
    if not q:
        return True
    ql = q.lower()
    fields = [
        str(person.get("id", "")),
        person.get("full_name", ""),
        *(person.get("known_aliases", []) or []),
        person.get("dob", ""),
        person.get("gender", ""),
        person.get("nationality", ""),
        person.get("current_address", ""),
        person.get("gang_affiliation", ""),
        *(person.get("known_associates", []) or []),
        *(person.get("organization_ties", []) or []),
        *(person.get("recent_contacts", []) or []),
        person.get("suspected_informant", ""),
        person.get("blackmail_material", ""),
        person.get("created_by", ""),
        person.get("access_level", ""),
        *(person.get("internal_flags", []) or []),
    ]
    return any(ql in str(x).lower() for x in fields)

# ========= App =========
app = FastAPI(title="The Archive API", version="1.0.0")

# ✅ Explicit dev origins, *no wildcard* when credentials are enabled
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,      # keep if you plan to use cookies/auth
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Health ----
@app.get("/healthz")
def health() -> Dict[str, str]:
    return {"status": "ok", "time": _now_iso()}

# =======================
#        AUTH
# =======================
@app.post("/api/login")
def login(payload: Dict[str, Any], response: Response) -> Dict[str, Any]:
    """
    Sets an HttpOnly JWT cookie and returns the public user.
    """
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    if not username or not password:
        raise HTTPException(400, detail="Username and password are required")

    agents = load_agents()
    for a in agents:
        if (a.get("username") or "").strip().lower() == username.lower() and (a.get("password") or "") == password:
            a["lastActive"] = _now_iso()
            save_agents(agents)
            user_pub = _public_agent(a)
            token = make_session(user_pub)
            response.set_cookie(
                key=SESSION_COOKIE,
                value=token,
                httponly=True,
                samesite="Lax",
                secure=False,  # set True behind HTTPS
                max_age=60 * 60 * 8,
                path="/",
            )
            return {"user": user_pub, "token": token}

    # No match after checking all agents
    raise HTTPException(401, detail="Invalid credentials")


@app.get("/api/me")
def me(request: Request) -> Dict[str, Any]:
    user = read_user_from_request(request)
    if not user:
        raise HTTPException(401, detail="Not authenticated")
    return {"user": user}

@app.post("/api/logout")
def logout(response: Response) -> Dict[str, Any]:
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"message": "ok"}

# =======================
#        AGENTS
# =======================
@app.get("/api/agents")
def list_agents(request: Request) -> List[AgentRecord]:
    """TopSecret+ can view full roster (PUBLIC view: no passwords)."""
    require_clearance(request, "TopSecret")
    return [_public_agent(a) for a in load_agents()]

@app.get("/api/agents/{agent_id}")
def get_agent(agent_id: str, request: Request) -> AgentRecord:
    require_clearance(request, "TopSecret")
    agents = load_agents()
    target = _normalize_id_str(agent_id)
    for a in agents:
        if _normalize_id_str(a.get("id", "")) == target:
            return _public_agent(a)
    raise HTTPException(404, detail="Agent not found")

@app.post("/api/agents")
def create_agent(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    """Create agent. Only Redline may create."""
    require_clearance(request, "Redline")
    required = ["name", "password", "rank", "clearance"]
    missing = [k for k in required if not str(payload.get(k, "")).strip()]
    if missing:
        raise HTTPException(400, detail=f"Missing fields: {', '.join(missing)}")

    agents = load_agents()

    # Assign ID if absent
    if not str(payload.get("id", "")).strip():
        # compute next "numeric" id but keep as string; you can pad in frontend if desired
        numeric_ids = []
        for a in agents:
            s = str(a.get("id", "")).strip()
            if s.isdigit():
                numeric_ids.append(int(s))
            else:
                try:
                    numeric_ids.append(int(s.lstrip("0") or "0"))
                except Exception:
                    pass
        next_id_num = (max(numeric_ids) + 1) if numeric_ids else 1
        new_id = str(next_id_num)
    else:
        new_id = str(payload["id"]).strip()

    agent: AgentRecord = {
        "id": new_id,
        "name": str(payload.get("name", "")).strip(),
        "username": str(payload.get("username", "")).strip(),
        "password": str(payload.get("password", "")),  # DEMO ONLY
        "rank": str(payload.get("rank", "")),
        "clearance": str(payload.get("clearance", "")),
        "createdBy": str(payload.get("createdBy", "system")),
        "createdAt": _today_str(),
        "lastActive": _now_iso(),
        # pass-through for optional RP fields if sent
        **{k: v for k, v in payload.items() if k not in {
            "id","name","username","password","rank","clearance","createdBy","createdAt","lastActive"
        }},
    }

    agents.append(agent)
    save_agents(agents)
    return {"message": "created", "agent": _public_agent(agent)}

@app.put("/api/agents/{agent_id}")
def update_agent(agent_id: str, payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    require_clearance(request, "Redline")
    agents = load_agents()
    target = _normalize_id_str(agent_id)

    for idx, a in enumerate(agents):
        if _normalize_id_str(a.get("id", "")) == target:
            updated = dict(a)
            # controlled updates
            for key in ["name", "username", "password", "rank", "clearance"]:
                if key in payload:
                    updated[key] = str(payload[key]) if payload[key] is not None else ""
            # pass-through additional meta fields if provided
            for k, v in payload.items():
                if k not in ["id", "createdAt", "createdBy"]:
                    updated[k] = v
            updated["lastActive"] = _now_iso()
            agents[idx] = updated
            save_agents(agents)
            return {"message": "updated", "agent": _public_agent(updated)}

    raise HTTPException(404, detail="Agent not found")

@app.delete("/api/agents/{agent_id}")
def delete_agent(agent_id: str, request: Request) -> Dict[str, Any]:
    require_clearance(request, "Redline")
    agents = load_agents()
    target = _normalize_id_str(agent_id)
    new_agents: List[AgentRecord] = []
    deleted: Optional[AgentRecord] = None
    for a in agents:
        if _normalize_id_str(a.get("id", "")) == target:
            deleted = a
        else:
            new_agents.append(a)
    if not deleted:
        raise HTTPException(404, detail="Agent not found")
    save_agents(new_agents)
    return {"message": "deleted", "agent": _public_agent(deleted)}

# =======================
#        PEOPLE
# =======================
@app.get("/api/all")
def list_people(request: Request) -> dict:
    """
    Minimal+ can list people; results are filtered by per-record visibility.
    - Default people are Minimal unless flagged "Person of Interest" (Restricted)
      or given a 'classification' field (then mapping is handled in auth.can_view_record()).
    """
    require_clearance(request, "Minimal")
    user = read_user_from_request(request)
    try:
        people = load_people()
        if not isinstance(people, list):
            people = []
        # filter by can_view_record
        visible = [p for p in people if can_view_record(user, p)] if user else []
        return {"results": visible}
    except Exception:
        return {"results": []}

@app.post("/api/search")
def search_people(payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    """
    Minimal+ can search; results filtered to what the caller can see.
    Body: { "query": "string" }
    Returns: { "results": [...] }
    """
    require_clearance(request, "Minimal")
    user = read_user_from_request(request)
    query = str(payload.get("query", "")).strip()
    if not query:
        return {"results": []}
    people = load_people()
    matched = [p for p in people if _matches_query(p, query)]
    visible = [p for p in matched if can_view_record(user, p)] if user else []
    return {"results": visible}

@app.post("/api/create")
def create_person(payload: PersonRecord, request: Request) -> Dict[str, Any]:
    # Only Redline may create/edit/delete people
    require_clearance(request, "Redline")
    people = load_people()
    if "id" not in payload or payload["id"] is None:
        payload["id"] = _next_person_id(people)
    else:
        try:
            new_id = int(payload["id"])
        except Exception:
            raise HTTPException(400, detail="ID must be an integer")
        payload["id"] = new_id
        for p in people:
            if int(p.get("id", -1)) == new_id:
                raise HTTPException(409, detail="A person with this ID already exists")

    payload.setdefault("created_by", "system")
    payload["last_updated"] = _now_iso()

    people.append(payload)
    save_people(people)
    return {"message": "created", "person": payload}

@app.put("/api/update/{person_id}")
def update_person(person_id: str, payload: Dict[str, Any], request: Request) -> Dict[str, Any]:
    require_clearance(request, "Redline")
    people = load_people()
    norm = _normalize_id_str(person_id)
    for idx, p in enumerate(people):
        if _normalize_id_str(p.get("id", "")) == norm:
            updated = dict(p)
            updated.update(payload)
            try:
                updated["id"] = int(updated.get("id", p["id"]))
            except Exception:
                updated["id"] = p["id"]
            updated["last_updated"] = _now_iso()
            people[idx] = updated
            save_people(people)
            return {"message": "updated", "person": updated}
    raise HTTPException(404, detail="Person not found")

@app.delete("/api/delete/{person_id}")
def delete_person(person_id: str, request: Request) -> Dict[str, Any]:
    require_clearance(request, "Redline")
    people = load_people()
    norm = _normalize_id_str(person_id)
    new_people: List[PersonRecord] = []
    deleted: Optional[PersonRecord] = None
    for p in people:
        if _normalize_id_str(p.get("id", "")) == norm:
            deleted = p
        else:
            new_people.append(p)
    if not deleted:
        raise HTTPException(404, detail="Person not found")
    save_people(new_people)
    return {"message": "deleted", "person": deleted}

# =======================
#         INTEL
# =======================
# (Note: redeclare load_intel for legacy {"results": [...]} format if needed)
def load_intel() -> List[IntelRecord]:
    data = _load_json(INTEL_PATH, {"results": []})
    if isinstance(data, dict) and isinstance(data.get("results"), list):
        return data["results"]
    return data if isinstance(data, list) else []

@app.get("/api/intel")
def list_intel(request: Request) -> Dict[str, List[IntelRecord]]:
    user = require_clearance(request, "Operational")
    items = load_intel()
    visible = [r for r in items if can_view_record(user, r)]
    return {"results": visible}

@app.post("/api/intel")
def create_intel(payload: IntelRecord, request: Request) -> Dict[str, IntelRecord]:
    require_clearance(request, "Operational")
    items = load_intel()
    if "id" not in payload or payload["id"] is None:
        payload["id"] = _next_intel_id(items)
    else:
        try:
            payload["id"] = int(payload["id"])
        except Exception:
            raise HTTPException(400, detail="ID must be an integer")
    items.append(payload)
    save_intel(items)
    return {"entry": payload}

@app.put("/api/intel/{intel_id}")
def update_intel(intel_id: str, payload: IntelRecord, request: Request) -> Dict[str, IntelRecord]:
    require_clearance(request, "Operational")
    items = load_intel()
    norm = _normalize_id_str(intel_id)
    for idx, r in enumerate(items):
        if _normalize_id_str(r.get("id", "")) == norm:
            updated = dict(r)
            updated.update(payload)
            try:
                updated["id"] = int(updated.get("id", r["id"]))
            except Exception:
                updated["id"] = r["id"]
            items[idx] = updated
            save_intel(items)
            return {"entry": updated}
    raise HTTPException(404, detail="Intel not found")

@app.delete("/api/intel/{intel_id}")
def delete_intel(intel_id: str, request: Request) -> Dict[str, Any]:
    require_clearance(request, "Operational")
    items = load_intel()
    norm = _normalize_id_str(intel_id)
    new_items: List[IntelRecord] = []
    deleted: Optional[IntelRecord] = None
    for r in items:
        if _normalize_id_str(r.get("id", "")) == norm:
            deleted = r
        else:
            new_items.append(r)
    if not deleted:
        raise HTTPException(404, detail="Intel not found")
    save_intel(new_items)
    return {"message": "deleted", "intel": deleted}

@app.get("/api/intel/{intel_id}")
def read_intel(intel_id: str, request: Request) -> Dict[str, Any]:
    user = require_clearance(request, "Operational")
    items = load_intel()
    target = _normalize_id_str(intel_id)
    for rec in items:
        if _normalize_id_str(rec.get("id", "")) == target:
            # enforce per-record classification on read
            if not can_view_record(user, rec):
                raise HTTPException(403, detail="Insufficient clearance for this file")
            return {"entry": rec}
    raise HTTPException(404, detail="Intel not found")

# --- High Priority helpers (add-only) ---
def _has_high_priority(rec: Dict[str, Any]) -> bool:
    flags = rec.get("internal_flags") or []
    try:
        return any(isinstance(f, str) and f.lower() == "high priority" for f in flags)
    except Exception:
        return False

def _set_high_priority(rec: Dict[str, Any], value: bool) -> None:
    flags = list(rec.get("internal_flags") or [])
    has = _has_high_priority(rec)

    if value and not has:
        flags.append("High Priority")
        rec["internal_flags"] = flags
        rec["high_priority_at"] = _now_iso()
    elif not value and has:
        rec["internal_flags"] = [f for f in flags if str(f).lower() != "high priority"]
        rec.pop("high_priority_at", None)

    # keep last_updated fresh if the record tracks it
    if "last_updated" in rec:
        rec["last_updated"] = _now_iso()

@app.get("/api/high-priority")
def get_high_priority(request: Request) -> List[Dict[str, Any]]:
    """
    Minimal+ can view the combined high-priority feed,
    but each entry is filtered by per-record visibility.
    """
    user = require_clearance(request, "Minimal")
    people = load_people()
    intel = load_intel()

    out: List[Dict[str, Any]] = []

    # people (filter by visibility)
    for p in (people or []):
        if isinstance(p, dict) and _has_high_priority(p) and can_view_record(user, p):
            out.append({
                "id": p.get("id"),
                "type": "person",
                "title": p.get("full_name") or p.get("name") or f"Person {p.get('id')}",
                "flaggedAt": p.get("high_priority_at") or p.get("last_updated") or _now_iso(),
            })

    # intel (filter by visibility)
    for i in (intel or []):
        if isinstance(i, dict) and _has_high_priority(i) and can_view_record(user, i):
            out.append({
                "id": i.get("id"),
                "type": "intel",
                "title": i.get("title") or f"Intel {i.get('id')}",
                "flaggedAt": i.get("high_priority_at") or i.get("last_updated") or _now_iso(),
            })

    # newest first
    out.sort(key=lambda r: r.get("flaggedAt", ""), reverse=True)
    return out

@app.post("/api/people/{person_id}/priority")
def set_person_priority(person_id: str, body: Dict[str, Any], request: Request) -> Dict[str, Any]:
    # Editing people requires Redline
    require_clearance(request, "Redline")
    items = load_people()
    target = _normalize_id_str(person_id)
    want = bool(body.get("high_priority", True))

    for rec in items:
        if _normalize_id_str(rec.get("id", "")) == target:
            if rec.get("internal_flags") is None:
                rec["internal_flags"] = []
            _set_high_priority(rec, want)
            save_people(items)
            return {"person": rec}

    raise HTTPException(404, detail="Person not found")

@app.post("/api/intel/{intel_id}/priority")
def set_intel_priority(intel_id: str, body: Dict[str, Any], request: Request) -> Dict[str, Any]:
    # Editing intel requires Operational+
    require_clearance(request, "Operational")
    items = load_intel()
    target = _normalize_id_str(intel_id)
    want = bool(body.get("high_priority", True))

    for rec in items:
        if _normalize_id_str(rec.get("id", "")) == target:
            if rec.get("internal_flags") is None:
                rec["internal_flags"] = []
            if "internal_flags" not in rec:
                rec["internal_flags"] = []
            _set_high_priority(rec, want)
            save_intel(items)
            return {"intel": rec}

    raise HTTPException(404, detail="Intel not found")
