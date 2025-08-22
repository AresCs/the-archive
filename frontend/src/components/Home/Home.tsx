import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import "./Home.css";

type Agent = {
  id: string;
  name: string;
  rank: string;
  clearance: string;
};

type Props = {
  user: Agent | null;
  loading: boolean;
  setUser: (user: Agent | null) => void;
};

type HighPriorityItem = {
  id: number;
  type: "person" | "intel";
  title: string;
  flaggedAt: string;
};

export default function HomePage({ user, loading, setUser }: Props) {
  const navigate = useNavigate();
  const [highPriority, setHighPriority] = useState<HighPriorityItem[]>([]);
  const [systemStatus] = useState("Online");

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  useEffect(() => {
    if (!user && !loading) {
      navigate("/");
    } else if (user) {
      // Placeholder fetch for future: will pull from backend once we add flagging
      fetch("http://localhost:8000/api/high-priority")
        .then((res) => res.json())
        .then((data: HighPriorityItem[]) => {
          // For now, just limit to top 5 and sort by newest flag
          const sorted = [...data].sort(
            (a, b) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime()
          );
          setHighPriority(sorted.slice(0, 5));
        })
        .catch(() => {
          // Until backend exists, we can show sample placeholder
          setHighPriority([
            {
              id: 1,
              type: "intel",
              title: "Night Market",
              flaggedAt: new Date().toISOString(),
            },
            {
              id: 2,
              type: "person",
              title: "Sakura",
              flaggedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            },
          ]);
        });
    }
  }, [user, loading, navigate]);

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
          <button onClick={() => navigate("/search")}>🔍 Search Records</button>
          <button onClick={() => navigate("/persons-of-interest")}>
            🧍 Persons of Interest
          </button>
          <button onClick={() => navigate("/intel")}>🧾 Intel Files</button>
          <button onClick={() => navigate("/profile")}>🕵️ Agent Profile</button>
          <button onClick={() => navigate("/agents")}>💻 Agents</button>
          <button onClick={handleLogout}>🚪 Logout</button>
        </div>

        <div className="recent-activity">
          <h2>High Priority</h2>
          <ul>
            {highPriority.length === 0 ? (
              <li>• No high priority items</li>
            ) : (
              highPriority.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="high-priority-item"
                  onClick={() =>
                    navigate(item.type === "person" ? `/search?query=${item.title}` : `/intel?query=${item.title}`)
                  }
                  style={{ cursor: "pointer" }}
                >
                  • [{item.type.toUpperCase()}] {item.title}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
