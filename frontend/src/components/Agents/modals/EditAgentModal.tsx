import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";

type AgentRecord = {
  id: string | number;
  name: string;
  username?: string;
  rank: string;
  clearance: string;
  lastActive?: string;
  createdBy?: string;
  createdAt?: string;
};

export type Agent = {
  id: string | number;
  name: string;
  username?: string;
  rank: string;
  clearance: string;
  lastActive: string;
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

const MIN_PASSWORD_LENGTH = 4;

export default function EditAgentModal({
  open,
  agent,
  onClose,
  onUpdated,
}: {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onUpdated: (a: Agent) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // optional
  const [rank, setRank] = useState<(typeof RANKS)[number]>("Observer");
  const [clearance, setClearance] = useState<(typeof CLEARANCES)[number]>("Minimal");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !agent) return;
    setName(agent.name ?? "");
    setUsername(agent.username ?? "");
    setPassword("");
    setRank((agent.rank as (typeof RANKS)[number]) ?? "Observer");
    setClearance((agent.clearance as (typeof CLEARANCES)[number]) ?? "Minimal");
    setSaving(false);
    setError(null);
  }, [open, agent]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  const canSubmit =
    open &&
    agent != null &&
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    !passwordTooShort;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !agent || saving) return;
    try {
      setSaving(true);
      setError(null);

      const payload: Record<string, unknown> = {
        name: name.trim(),
        username: username.trim(),
        rank,
        clearance,
      };
      if (password.trim()) payload.password = password.trim();

      const { agent: updated } = await api.put<{ agent: AgentRecord }>(
        `/api/agents/${encodeURIComponent(String(agent.id))}`,
        payload
      );

      const mapped: Agent = {
        id: updated.id,
        name: updated.name,
        username: updated.username,
        rank: updated.rank,
        clearance: updated.clearance,
        lastActive: updated.lastActive ? new Date(updated.lastActive).toLocaleString() : "Unknown",
        createdBy: updated.createdBy ?? "—",
        createdAt: updated.createdAt ?? "—",
      };

      onUpdated(mapped);
      onClose();
    } catch {
      setError("Failed to update agent.");
    } finally {
      setSaving(false);
    }
  }, [agent, canSubmit, name, username, password, rank, clearance, onUpdated, onClose, saving]);

  if (!open || !agent) return null;

  return (
    <div className="agents-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-agent-title">
      <div className="agents-modal">
        <h2 id="edit-agent-title" className="agents-title" style={{ marginBottom: "0.75rem" }}>
          Edit Agent
        </h2>

        <div className="agent-form-grid">
          <label className="agent-field">
            <span>Name</span>
            <input type="text" value={name} onChange={(ev) => setName(ev.target.value)} required />
          </label>

          <label className="agent-field">
            <span>Username</span>
            <input type="text" value={username} onChange={(ev) => setUsername(ev.target.value)} required />
          </label>

          <label className="agent-field">
            <span>New Password (optional)</span>
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder={`Leave blank to keep current (min ${MIN_PASSWORD_LENGTH})`}
            />
            {passwordTooShort && (
              <div className="agents-error" style={{ marginTop: "0.25rem" }}>
                Password must be at least {MIN_PASSWORD_LENGTH} characters.
              </div>
            )}
          </label>

          <label className="agent-field">
            <span>Rank</span>
            <select value={rank} onChange={(ev) => setRank(ev.target.value as (typeof RANKS)[number])}>
              {RANKS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>

          <label className="agent-field">
            <span>Clearance</span>
            <select value={clearance} onChange={(ev) => setClearance(ev.target.value as (typeof CLEARANCES)[number])}>
              {CLEARANCES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <div className="agents-error" role="alert">{error}</div>}

        <div className="agent-form-actions">
          <button type="button" className="add-button" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button type="button" className="back-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
