// frontend/src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login/Login";
import { useEffect, useState } from "react";
import type { Agent } from "./types";

// Lazy-load heavy pages at module scope
const Home = React.lazy(() => import("./components/Home/Home"));
const SearchPage = React.lazy(() => import("./components/Search/SearchPage"));
const PersonsOfInterest = React.lazy(
  () => import("./components/PersonsOfInterest/PersonsOfInterestPage")
);
const IntelFilesPage = React.lazy(
  () => import("./components/Intel/IntelFilesPage")
);
const AgentProfile = React.lazy(
  () => import("./components/Profile/AgentProfile")
);
const Agents = React.lazy(() => import("./components/Agents/AgentsPage"));

function App() {
  const [user, setUser] = useState<Agent | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ✅ On app load, restore user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const parsed: Agent = JSON.parse(stored);
        
        setUser(parsed);
      } catch {
        localStorage.removeItem("user");
      }
    }
    setLoadingUser(false);
  }, []);

  return (
    <Router>
      <React.Suspense
        fallback={
          <div
            style={{ display: "grid", placeItems: "center", minHeight: "40vh" }}
          >
            Loading…
          </div>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <Login
                onLogin={(user: Agent) => {
                  setUser(user);
                  localStorage.setItem("user", JSON.stringify(user));
                }}
              />
            }
          />
          <Route
            path="/home"
            element={
              <Home user={user} loading={loadingUser} setUser={setUser} />
            }
          />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/persons-of-interest" element={<PersonsOfInterest />} />
          <Route path="/intel" element={<IntelFilesPage />} />
          <Route path="/profile" element={<AgentProfile />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
