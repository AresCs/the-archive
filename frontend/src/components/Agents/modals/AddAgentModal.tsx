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

export default function AddAgentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (a: Agent) => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rank, setRank] = useState<(typeof RANKS)[number]>("Observer");
  const [clearance, setClearance] = useState<(typeof CLEARANCES)[number]>("Minimal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setUsername("");
    setPassword("");
    setRank("Observer");
    setClearance("Minimal");
    setSaving(false);
    setError(null);
  }, [open]);

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
    name.trim().length > 0 &&
    username.trim().length > 0 &&
    password.trim().length >= MIN_PASSWORD_LENGTH;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || saving) return;
    try {
      setSaving(true);
      setError(null);

      const { agent } = await api.post<{ agent: AgentRecord }>("/api/agents", {
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        rank,
        clearance,
        createdBy: "You",
      });

      const mapped: Agent = {
        id: agent.id,
        name: agent.name,
        username: agent.username,
        rank: agent.rank,
        clearance: agent.clearance,
        lastActive: agent.lastActive ? new Date(agent.lastActive).toLocaleString() : "Unknown",
        createdBy: agent.createdBy ?? "—",
        createdAt: agent.createdAt ?? "—",
      };

      onCreated(mapped);
      onClose();
    } catch {
      setError("Failed to create agent.");
    } finally {
      setSaving(false);
    }
  }, [canSubmit, clearance, name, onClose, onCreated, password, rank, saving, username]);

  if (!open) return null;

  return (
    <div className="agents-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-agent-title">
      <div className="agents-modal">
        <h2 id="add-agent-title" className="agents-title" style={{ marginBottom: "0.75rem" }}>
          Add Agent
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
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              placeholder={`Min ${MIN_PASSWORD_LENGTH} chars`}
              required
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
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="back-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
