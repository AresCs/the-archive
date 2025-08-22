import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import { api } from "../../lib/api";
import "../Agents/AgentsPage.css";

/* ===== Types ===== */
type AgentRecord = {
  id: string | number;
  name: string;
  username?: string;
  rank: string;
  clearance: string;
  lastActive?: string;   // ISO
  createdBy?: string;
  createdAt?: string;    // YYYY-MM-DD
};

type Agent = {
  id: string | number;
  name: string;
  username?: string;
  rank: string;
  clearance: string;
  lastActive: string;    // prettified
  createdBy: string;
  createdAt: string;
};

export default function AgentProfile() {
  const navigate = useNavigate();

  // Read logged-in user id from localStorage (saved in App on login)
  const loggedInId = useMemo<string | null>(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { id?: string | number } | null;
      return parsed?.id != null ? String(parsed.id) : null;
    } catch {
      return null;
    }
  }, []);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const mapRecord = (rec: AgentRecord): Agent => ({
      id: rec.id,
      name: rec.name,
      username: rec.username,
      rank: rec.rank,
      clearance: rec.clearance,
      lastActive: rec.lastActive ? new Date(rec.lastActive).toLocaleString() : "Unknown",
      createdBy: rec.createdBy ?? "—",
      createdAt: rec.createdAt ?? "—",
    });

    const load = async () => {
      if (!loggedInId) {
        if (mounted) {
          setError("No logged-in user found.");
          setLoading(false);
        }
        return;
      }

      try {
        if (mounted) {
          setLoading(true);
          setError(null);
        }

        // Backend now supports GET /api/agents/:id
        const rec = await api.get<AgentRecord>(`/api/agents/${encodeURIComponent(loggedInId)}`);
        if (mounted) setAgent(mapRecord(rec));
      } catch {
        if (mounted) setError("Failed to load agent profile.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [loggedInId]);

  return (
    <div className="agents-outer">
      <MatrixCanvas />

      <div className="agents-inner" style={{ maxWidth: 900 }}>
        {/* Header (reuse Agents styles) */}
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

          {!loading && !error && agent && (
            <div className="agent-card" style={{ maxWidth: 800, margin: "0 auto", padding: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <p><strong>Name:</strong> {agent.name}</p>
                <p><strong>Username:</strong> {agent.username ?? "—"}</p>
                <p><strong>Rank:</strong> {agent.rank}</p>
                <p><strong>Clearance:</strong> {agent.clearance}</p>
                <p><strong>Last Active:</strong> {agent.lastActive}</p>
                <p><strong>Created By:</strong> {agent.createdBy}</p>
                <p><strong>Created At:</strong> {agent.createdAt}</p>
              </div>
            </div>
          )}

          {!loading && !error && !agent && (
            <div className="agents-empty">No profile to display.</div>
          )}
        </div>
      </div>
    </div>
  );
}
