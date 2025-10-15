import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import "./Home.css";
import type { Agent } from "../../types";
import { hasClearance } from "../../lib/auth";

type Props = {
  user: Agent | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<Agent | null>>;
};

type HighPriorityItem = {
  id: number;
  type: "person" | "intel";
  title: string;
  flaggedAt: string; // ISO string
};

// Build API base using the same host the app is served from (avoids localhost/127 mismatch)
const HOST = window.location.hostname;
const API = `http://${HOST}:8000`;

export default function HomePage({ user, loading, setUser }: Props) {
  const navigate = useNavigate();
  const [highPriority, setHighPriority] = useState<HighPriorityItem[]>([]);
  const [hpLoading, setHpLoading] = useState(false);
  const [hpError, setHpError] = useState<string | null>(null);
  const [systemStatus] = useState("Online");

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/logout`, { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      navigate("/");
    }
  };

  useEffect(() => {
    if (!user || loading) return;

    const ctrl = new AbortController();
    const fetchHP = async () => {
      setHpLoading(true);
      setHpError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/high-priority`, {
          method: "GET",
          signal: ctrl.signal,
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data: HighPriorityItem[] = await res.json();
        const sorted = [...data].sort(
          (a, b) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()
        );
        setHighPriority(sorted.slice(0, 5));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHpError(err instanceof Error ? err.message : "Failed to load high priority list.");
        setHighPriority([]);
      } finally {
        setHpLoading(false);
      }
    };

    void fetchHP();
    return () => ctrl.abort();
  }, [user, loading]);

  useEffect(() => {
    if (!user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  const renderedHP = useMemo(() => {
    if (hpLoading) return <li>• Loading…</li>;
    if (hpError) return <li>• {hpError}</li>;
    if (highPriority.length === 0) return <li>• No high priority items</li>;

    return highPriority.map((item) => (
      <li
        key={`${item.type}-${item.id}`}
        className="high-priority-item"
        onClick={() =>
          navigate(
            item.type === "person"
              ? `/search?query=${encodeURIComponent(item.title)}`
              : `/intel?query=${encodeURIComponent(item.title)}`
          )
        }
        style={{ cursor: "pointer" }}
        title={`Flagged at ${new Date(item.flaggedAt).toLocaleString()}`}
      >
        • [{item.type.toUpperCase()}] {item.title}
      </li>
    ));
  }, [hpLoading, hpError, highPriority, navigate]);

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return null;

  return (
    <div className="home-outer">
      <MatrixCanvas />

      <div className="home-inner">
        <div className="home-header">
          <h1 className="home-title">Welcome back, {user.name}!</h1>
        </div>
        <p className="system-status">
          System Status: <span className="online">{systemStatus}</span>
        </p>
        <p className="clearance">Clearance Level: {user.clearance}</p>

        <div className="home-buttons">
          {/* Minimal and up */}
          {hasClearance(user, "Minimal") && (
            <>
              <button onClick={() => navigate("/search")}>🔍 Search Records</button>
              <button onClick={() => navigate("/profile")}>🕵️ Agent Profile</button>
            </>
          )}

          {/* Restricted and up */}
          {hasClearance(user, "Restricted") && (
            <button onClick={() => navigate("/poi")}>🧍 Persons of Interest</button>
          )}

          {/* Operational and up */}
          {hasClearance(user, "Operational") && (
            <button onClick={() => navigate("/intel")}>🧾 Intel Files</button>
          )}

          {/* TopSecret and Redline */}
          {hasClearance(user, "TopSecret") && (
            <button onClick={() => navigate("/agents")}>💻 Agents</button>
          )}

          {/* Always show logout for authenticated users */}
          <button onClick={handleLogout}>🚪 Logout</button>
        </div>

        <div className="recent-activity">
          <h2>High Priority</h2>
          <ul>{renderedHP}</ul>
        </div>
      </div>
    </div>
  );
}
