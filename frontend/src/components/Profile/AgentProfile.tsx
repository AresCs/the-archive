// frontend/src/components/Profile/AgentProfile.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import { api } from "../../lib/api";
import "../Agents/AgentsPage.css";
import type { Agent as SessionAgent } from "../../types";

/* ===== Types (string-only id to avoid TS error) ===== */
type AgentRecord = {
  id?: string;            // <-- string only
  name?: string;
  username?: string;
  rank?: string;
  clearance?: string;
  lastActive?: string;    // ISO
  createdBy?: string;
  createdAt?: string;     // YYYY-MM-DD
};

type AgentDisplay = {
  id: string;
  name: string;
  username: string;
  rank: string;
  clearance: string;
  lastActive: string;     // prettified
  createdBy: string;
  createdAt: string;
};

type MeResponse = { user: AgentRecord };

function hasRosterAccess(clearance?: string): boolean {
  const c = (clearance ?? "").replace(/\s+/g, "").toLowerCase();
  return c === "topsecret" || c === "redline";
}

function fmtDate(s?: string): string {
  if (!s) return "Unknown";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
}

function toDisplay(rec: AgentRecord): AgentDisplay {
  return {
    id: rec.id ?? "—",
    name: (rec.name ?? "").trim() || "—",
    username: (rec.username ?? "").trim() || "—",
    rank: (rec.rank ?? "").trim() || "—",
    clearance: (rec.clearance ?? "").trim() || "—",
    lastActive: fmtDate(rec.lastActive),
    createdBy: (rec.createdBy ?? "").trim() || "—",
    createdAt: (rec.createdAt ?? "").trim() || "—",
  };
}

// shallow merge preferring a over b (strings normalized)
function mergeAgent(a?: AgentRecord | null, b?: AgentRecord | null): AgentRecord {
  const pick = (k: keyof AgentRecord): string | undefined => {
    const av = a?.[k];
    const bv = b?.[k];
    const as = typeof av === "string" ? av : undefined;
    const bs = typeof bv === "string" ? bv : undefined;
    return (as ?? bs)?.trim() || undefined;
  };
  return {
    id: pick("id"),
    name: pick("name"),
    username: pick("username"),
    rank: pick("rank"),
    clearance: pick("clearance"),
    lastActive: pick("lastActive"),
    createdBy: pick("createdBy"),
    createdAt: pick("createdAt"),
  };
}

export default function AgentProfile({
  user, // optional; provided by App route guard
}: {
  user?: SessionAgent | null;
}) {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<AgentDisplay | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Local snapshot saved at login
  const localUser = useMemo<SessionAgent | null>(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as SessionAgent) : null;
    } catch {
      return null;
    }
  }, []);

  const effectiveClearance = useMemo<string | undefined>(
    () => user?.clearance ?? localUser?.clearance ?? undefined,
    [user, localUser]
  );

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Ask server who we are
        const me = await api.get<MeResponse>("/api/me");
        if (!active) return;

        // 2) Merge with local snapshot to fill blanks
        const merged = mergeAgent(me.user, {
          id: localUser?.id, // already string per your shared Agent type
          name: localUser?.name,
          username: (localUser as unknown as AgentRecord | null)?.username,
          rank: (localUser as unknown as AgentRecord | null)?.rank,
          clearance: localUser?.clearance,
          lastActive: (localUser as unknown as AgentRecord | null)?.lastActive,
          createdBy: (localUser as unknown as AgentRecord | null)?.createdBy,
          createdAt: (localUser as unknown as AgentRecord | null)?.createdAt,
        });

        // 3) If we have roster rights and an id, fetch the full record
        const idForLookup = merged.id ?? me.user.id ?? localUser?.id ?? undefined;
        if (hasRosterAccess(effectiveClearance) && idForLookup) {
          try {
            const full = await api.get<AgentRecord>(
              `/api/agents/${encodeURIComponent(idForLookup)}`
            );
            if (!active) return;
            setProfile(toDisplay(mergeAgent(full, merged)));
            return;
          } catch {
            // ignore; keep merged
          }
        }

        setProfile(toDisplay(merged));
      } catch (e) {
        // 4) Server failed — show local snapshot if available
        if (localUser) {
          const fallback = mergeAgent({
            id: localUser.id,
            name: localUser.name,
            username: (localUser as unknown as AgentRecord | null)?.username,
            rank: (localUser as unknown as AgentRecord | null)?.rank,
            clearance: localUser.clearance,
            lastActive: (localUser as unknown as AgentRecord | null)?.lastActive,
            createdBy: (localUser as unknown as AgentRecord | null)?.createdBy,
            createdAt: (localUser as unknown as AgentRecord | null)?.createdAt,
          }, null);
          setProfile(toDisplay(fallback));
        } else {
          setError(e instanceof Error ? e.message : "Failed to load agent profile.");
          setProfile(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [effectiveClearance, localUser]);

  return (
    <div className="agents-outer">
      <MatrixCanvas />

      <div className="agents-inner" style={{ maxWidth: 900 }}>
        <div className="agents-header">
          <h1 className="agents-title">Agent Profile</h1>
          <div className="agents-header-actions">
            <button className="back-button" type="button" onClick={() => navigate("/home")}>
              ⬅ Back
            </button>
          </div>
        </div>

        <div className="agents-scroll">
          {loading && <div className="agents-loading">Loading agent profile…</div>}
          {!loading && error && <div className="agents-error">{error}</div>}

          {!loading && !error && profile && (
            <div className="agent-card" style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Username:</strong> {profile.username}</p>
                <p><strong>Rank:</strong> {profile.rank}</p>
                <p><strong>Clearance:</strong> {profile.clearance}</p>
                <p><strong>Last Active:</strong> {profile.lastActive}</p>
                <p><strong>Created By:</strong> {profile.createdBy}</p>
                <p><strong>Created At:</strong> {profile.createdAt}</p>
                <p><strong>Agent ID:</strong> {profile.id}</p>
              </div>
            </div>
          )}

          {!loading && !error && !profile && (
            <div className="agents-empty">No profile to display.</div>
          )}
        </div>
      </div>
    </div>
  );
}
