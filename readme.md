
# 🗂️ The Archive

A dark-themed information database built for immersive roleplay scenarios (e.g. FiveM) — inspired by underground intelligence agencies. This app allows agents to log, search, and manage detailed dossiers on subjects of interest.

---

## 🔧 Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python)
- **Styling**: CSS modules (custom, cyberpunk-inspired)
- **DB**: Fake JSON-based storage (for now)

---

## 📦 Prerequisites

- Node.js (v18+ recommended)
- Python 3.10+
- pip (Python package installer)

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/the-archive.git
cd the-archive
```

---

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

### 3. Start the Vite Dev Server

```bash
npm run dev
```

Runs on: [http://localhost:5173](http://localhost:5173)

---

### 4. Set Up the Backend

```bash
cd ../backend
pip install fastapi uvicorn
```

Create a file `main.py` (or use existing) and run:

```bash
uvicorn main:app --reload
```

Runs on: [http://localhost:8000](http://localhost:8000)

---

## 📂 Project Structure

```
the-archive/
├── frontend/
│   ├── components/
│   │   ├── Login/
│   │   ├── Home/
│   │   ├── Search/
│   │   └── PersonCard.tsx
│   ├── types.ts
│   └── main.tsx
│
├── backend/
│   ├── main.py
│   └── fake_db.json (optional)
```

---

## ✨ Features

- 🔐 Login animation with timed reveal
- 🧠 Editable person records (alias, gang, DOB, etc.)
- 🔎 Search by name / alias / gang
- 🧾 Dynamic display cards with real-time updates
- 📍 Modular layout (Home, Records, Intel, Map, etc.)

---


## 🔄 API Routes (verified on 2025-08-21)

| Method | Endpoint                 | Description                           |
|-------:|--------------------------|---------------------------------------|
| GET    | `/api/all`               | Return all people records             |
| POST   | `/api/search`            | Search people by free text            |
| POST   | `/api/create`            | Create a new person record            |
| PUT    | `/api/update/{id}`       | Update a person by ID                 |
| DELETE | `/api/delete/{person_id}`| Delete a person by ID                 |
| GET    | `/api/intel`             | List intel entries                    |
| POST   | `/api/intel`             | Add an intel entry                    |
| DELETE | `/api/intel/{intel_id}`  | Delete an intel entry by ID           |
| GET    | `/api/agents`            | List agents                           |
| POST   | `/api/agents`            | Create an agent                       |
| DELETE | `/api/agents/{agent_id}` | Delete an agent by ID                 |
| POST   | `/api/login`             | Login with username/password          |
| POST   | `/api/logout`            | Logout (dummy endpoint)               |

> CORS is enabled for `http://localhost:5173` in `main.py`.


| Method | Endpoint        | Description              |
|--------|------------------|--------------------------|
| GET    | `/api/all`       | Return all fake entries  |
| POST   | `/api/search`    | Search people by text    |
| POST   | `/api/create`    | (Coming soon) Add entry  |
| POST   | `/api/update`    | (Coming soon) Edit entry |

---

## 💡 Coming Soon

- Live map overlay for gang/police zones
- Intel file uploads
- Role-based access (Handler, Field Agent)
- Audio intercept logs
- SQLite or PostgreSQL DB support

---

## 🧪 Sample Fake Data

```json
{
  "id": 1,
  "full_name": "Kane Holloway",
  "dob": "1993-04-12",
  "gang_affiliation": "Red Serpents"
}
```

---

## 🧤 Theme & Design

- Inspired by cold-war era spy systems
- Custom flicker/glitch effects
- Optimized for immersive RP terminals

---

## 🧠 License

MIT — customize it, reskin it, and deploy it to your FiveM world.

---

## 🙋 Support

Open an issue or drop a message if you’d like help extending this project!


## 🧑‍💻 Developer Usage: Working with ChatGPT Prompts

This repo does **not** ship a model or API client by default—it's a data-first scaffold. You can integrate ChatGPT (or any LLM) by treating the JSON files as prompt/context sources and wiring an API client into the frontend or backend.

### Where context lives

- `backend/people.json` — structured dossiers (names, flags, links to reports).  
- `backend/inteldata.json` — narrative intel items (title, summary, linked persons/operations, status, timestamps).  
- `backend/agents.json` — operator metadata (name, rank, specialties, logins).

### Recommended prompt layout

Add optional prompt fields to **agents** so each operator can carry their own system/style instructions. This is backward‑compatible because unknown fields are ignored by current endpoints.

```jsonc
// backend/agents.json (excerpt)
{
  "id": "007",
  "username": "veil",
  "password": "secret",
  "name": "Agent Veil",
  "rank": "Handler",
  "specialties": ["HUMINT", "Deception"],
  "system_prompt": "You are Agent Veil, a concise but incisive analyst...",
  "style_guide": [
    "Answer in bullet points unless asked otherwise",
    "Cite file IDs when referencing intel"
  ]
}
```

If you prefer to keep prompts separate, create a new file like `backend/prompts.json` and load it similarly to the JSON helpers in `fake_db.py`.

### Backend wiring (example)

`main.py` already exposes `/api/agents`, `/api/intel`, and `/api/all` (people). You can surface prompt metadata alongside an agent with no schema changes:

```python
# in main.py (inside GET /api/agents handler)
agents = load_agents()
# Optionally filter fields before returning to the UI:
public = [
    {k: v for k, v in a.items() if k not in {"password"}}
    for a in agents
]
return {"agents": public}
```

Then, from the UI or a worker, compose a chat request using the selected agent's prompt + relevant intel/people summaries.

### Composing a chat call (Python, illustrative)

```python
from datetime import datetime

def build_messages(agent, query, intel_items, people_items):
    system = agent.get("system_prompt") or "You are an OSINT analyst."
    style = agent.get("style_guide", [])
    context = [
        f"- Intel: {i['id']} :: {i['title']} — {i['summary']}"
        for i in intel_items[:5]
    ] + [
        f"- Person: {p.get('full_name')} — flags: {', '.join(p.get('internal_flags', []))}"
        for p in people_items[:5]
    ]
    return [
        {"role": "system", "content": system},
        {"role": "system", "content": "Style guide: " + "; ".join(style)},
        {"role": "user", "content": f"Time: {datetime.utcnow().isoformat()}Z"},
        {"role": "user", "content": "Context:\n" + "\n".join(context)},
        {"role": "user", "content": "Task: " + query},
    ]
```

> Plug the `messages` into your LLM client (OpenAI, Azure, etc.). The repo leaves provider choice up to you.

### Step‑by‑step: add a new prompt‑driven agent

1. **Create an agent** in `backend/agents.json` (add `system_prompt`/`style_guide` keys as above).  
2. **Run the backend** (`uvicorn main:app --reload`) and hit `GET /api/agents` to verify your new agent appears.  
3. **Select context**: query `/api/intel` and `/api/all` to fetch items to ground responses.  
4. **Build messages** exactly as shown above and call your chat API.  
5. **Iterate**: refine `system_prompt`/`style_guide` and re‑test.

### Data contracts (observed from the repo)

- **People** items include fields like: `id`, `full_name`, `dob`, `nationality`, `access_level`, `internal_flags`, `linked_reports`, `image_url`.  
- **Intel** items include: `id`, `title`, `summary`, `linked_persons`, `linked_operations`, `status`, `created_by`, `last_updated`.  
- **Agents** include: `id`, `username`, `password`, `name`, `rank`, `specialties`, `operations`, `lastActive`, `logins`, `clearance`.

> Tip: never expose `password` to the UI; the example above filters it out before returning agents.

### Notes & gotchas

- **CORS**: `http://localhost:5173` is whitelisted in the backend. Update in `main.py` if your frontend runs elsewhere.  
- **Storage**: the project uses JSON files as a fake DB. Writes persist to the repo directory; commit or mount volumes accordingly.  
- **Auth**: `/api/login` validates against `agents.json`; there's a placeholder `/api/logout`. Bring your own token/session model in production.

