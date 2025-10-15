import { useCallback, useEffect, useMemo, useState } from "react";
import "./AgentsPage.css";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import { api } from "../../lib/api";
import AddAgentModal from "./modals/AddAgentModal";
import EditAgentModal from "./modals/EditAgentModal";
import ConfirmDeleteModal from "./modals/ConfirmDeleteModal";
import { useNavigate } from "react-router-dom";
import type { Agent as SessionAgent } from "../../types"; // logged-in user type

type Props = {
  user: SessionAgent | null;
};

type AgentApiRecord = {
  id: string | number;
  name: string;
  username?: string;
  rank: string;
  clearance: string;
  lastActive?: string; // ISO
  createdBy?: string;
  createdAt?: string; // YYYY-MM-DD
};

type AgentRow = {
  id: string | number;
  name: string;
  username?: string;
  rank: string;
  clearance: string;
  lastActive: string; // prettified
  createdBy: string;
  createdAt: string;
};

const RANKS = [
  "Observer",
  "Recon Agent",
  "Operative",
  "Analyst",
  "Coordinator",
  "Specialist",
  "Strategist",
  "Handler",
  "Director",
  "Chief Overseer",
] as const;

const CLEARANCES = [
  "Minimal",
  "Confidential",
  "Restricted",
  "Classified",
  "Operational",
  "Top Secret",
  "Redline",
] as const;

export default function AgentsPage({ user }: Props) {
  const navigate = useNavigate();

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modals
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AgentRow | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // filters
  const [query, setQuery] = useState<string>("");
  const [rankFilter, setRankFilter] = useState<string>("");
  const [clearanceFilter, setClearanceFilter] = useState<string>("");

  // Only Redline can create/edit/delete agents (TopSecret is view-only)
  const canAdminAgents = user?.clearance === "Redline";

  useEffect(() => {
    let mounted = true;
    const load = async (): Promise<void> => {
      try {
        setError(null);
        setLoading(true);
        const data = await api.get<AgentApiRecord[] | { results?: AgentApiRecord[] }>("/api/agents");
        const raw = Array.isArray(data) ? data : data?.results ?? [];
        const mapped: AgentRow[] = raw.map((a) => ({
          id: a.id,
          name: a.name,
          username: a.username,
          rank: a.rank,
          clearance: a.clearance,
          lastActive: a.lastActive ? new Date(a.lastActive).toLocaleString() : "Unknown",
          createdBy: a.createdBy ?? "—",
          createdAt: a.createdAt ?? "—",
        }));
        const sorted = [...mapped].sort((x, y) => x.name.localeCompare(y.name));
        if (mounted) setAgents(sorted);
      } catch {
        if (mounted) setError("Failed to load agents.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const doDelete = useCallback(
    async (id: string | number): Promise<void> => {
      try {
        setDeleting(true);
        await api.delete(`/api/agents/${encodeURIComponent(String(id))}`);
        setAgents((prev) => prev.filter((a) => a.id !== id));
      } catch {
        alert("Failed to delete agent.");
      } finally {
        setDeleting(false);
        setPendingDeleteId(null);
      }
    },
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return agents.filter((a) => {
      const matchesQuery =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.username?.toLowerCase().includes(q) ?? false) ||
        a.rank.toLowerCase().includes(q) ||
        a.clearance.toLowerCase().includes(q);

      const matchesRank = !rankFilter || a.rank === rankFilter;
      const matchesClearance = !clearanceFilter || a.clearance === clearanceFilter;
      return matchesQuery && matchesRank && matchesClearance;
    });
  }, [agents, query, rankFilter, clearanceFilter]);

  const pendingName = useMemo(
    () => agents.find((a) => a.id === pendingDeleteId)?.name,
    [agents, pendingDeleteId]
  );

  const content = useMemo(() => {
    if (loading) return <div className="agents-loading">Loading agents…</div>;
    if (error) return <div className="agents-error">{error}</div>;
    if (filtered.length === 0) return <div className="agents-empty">No agents found.</div>;

    return (
      <div className="agents-grid">
        {filtered.map((agent) => (
          <div key={agent.id} className="agent-card">
            <div>
              <p><strong>Name:</strong> {agent.name}</p>
              <p><strong>Username:</strong> {agent.username ?? "—"}</p>
              <p><strong>Rank:</strong> {agent.rank}</p>
              <p><strong>Clearance:</strong> {agent.clearance}</p>
              <p><strong>Last Active:</strong> {agent.lastActive}</p>
              <p><strong>Created By:</strong> {agent.createdBy}</p>
              <p><strong>Created At:</strong> {agent.createdAt}</p>
            </div>

            <div className="agent-actions">
              {canAdminAgents ? (
                <>
                  <button
                    className="edit-button"
                    type="button"
                    onClick={() => setEditing(agent)}
                    title={`Edit ${agent.name}`}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => setPendingDeleteId(agent.id)}
                    title={`Delete ${agent.name}`}
                  >
                    🗑 Delete
                  </button>
                </>
              ) : (
                <>
                  <button className="edit-button" type="button" disabled title="Redline required">
                    ✏️ Edit
                  </button>
                  <button className="delete-button" type="button" disabled title="Redline required">
                    🗑 Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }, [filtered, error, loading, canAdminAgents]);

  return (
    <div className="agents-outer">
      <MatrixCanvas />
      <div className="agents-inner">
        {/* Sticky header */}
        <div className="agents-header">
          <h1 className="agents-title">Agents Directory</h1>
          <div className="agents-header-actions">
            {canAdminAgents ? (
              <button
                className="add-button"
                type="button"
                onClick={() => setAdding(true)}
                title="Add Agent (Redline only)"
              >
                ➕ Add Agent
              </button>
            ) : (
              <button className="add-button" type="button" disabled title="Redline required">
                ➕ Add Agent
              </button>
            )}
            <button
              className="back-button"
              type="button"
              onClick={() => navigate("/home")}
            >
              ⬅ Back
            </button>
          </div>
        </div>

        {/* Filters row */}
        <div className="agents-filters">
          <input
            className="agents-filter-input"
            type="text"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder="Search name, username, rank, clearance…"
            aria-label="Search agents"
          />
          <select
            className="agents-filter-select"
            value={rankFilter}
            onChange={(ev) => setRankFilter(ev.target.value)}
            aria-label="Filter by rank"
          >
            <option value="">All Ranks</option>
            {RANKS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            className="agents-filter-select"
            value={clearanceFilter}
            onChange={(ev) => setClearanceFilter(ev.target.value)}
            aria-label="Filter by clearance"
          >
            <option value="">All Clearances</option>
            {CLEARANCES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="agents-filters-actions">
            <button
              type="button"
              className="edit-button"
              onClick={() => {
                setQuery("");
                setRankFilter("");
                setClearanceFilter("");
              }}
              title="Clear filters"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="agents-scroll">{content}</div>
      </div>

      {/* Modals */}
      <AddAgentModal
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(a) => setAgents((prev) => [a, ...prev])}
      />

      <EditAgentModal
        open={Boolean(editing)}
        agent={editing}
        onClose={() => setEditing(null)}
        onUpdated={(updated) =>
          setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        }
      />

      <ConfirmDeleteModal
        open={pendingDeleteId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId != null && void doDelete(pendingDeleteId)}
        name={pendingName}
        busy={deleting}
      />
    </div>
  );
}
