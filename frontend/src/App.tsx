// frontend/src/App.tsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login/Login";
import type { Agent } from "./types";
import { ProtectedRoute } from "./lib/auth";
import AgentsPage from "./components/Agents/AgentsPage"; // this one accepts user

// Lazy pages
const Home = React.lazy(() => import("./components/Home/Home")); // accepts user, loading, setUser
const SearchPage = React.lazy(() => import("./components/Search/SearchPage")); // no user prop
const PersonsOfInterest = React.lazy(
  () => import("./components/PersonsOfInterest/PersonsOfInterestPage")
); // no user prop
const IntelFilesPage = React.lazy(
  () => import("./components/Intel/IntelFilesPage")
); // no user prop
const AgentProfile = React.lazy(
  () => import("./components/Profile/AgentProfile")
); // no user prop

function App(): React.ReactElement {
  const [user, setUser] = useState<Agent | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

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
      <React.Suspense fallback={<div>Loading…</div>}>
        <Routes>
          <Route
            path="/login"
            element={
              <Login
                onLogin={(u: Agent) => {
                  setUser(u);
                  localStorage.setItem("user", JSON.stringify(u));
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

          {/* Minimal and up: Search */}
          <Route
            path="/search"
            element={
              <ProtectedRoute user={user} need="Minimal">
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* Restricted and up: Persons of Interest */}
          <Route
            path="/poi"
            element={
              <ProtectedRoute user={user} need="Restricted">
                <PersonsOfInterest />
              </ProtectedRoute>
            }
          />

          {/* Operational and up: Intel Files */}
          <Route
            path="/intel"
            element={
              <ProtectedRoute user={user} need="Operational">
                <IntelFilesPage />
              </ProtectedRoute>
            }
          />

          {/* TopSecret (view-only) and Redline (full): Agents */}
          <Route
            path="/agents"
            element={
              <ProtectedRoute user={user} need="TopSecret">
                <AgentsPage user={user} />
              </ProtectedRoute>
            }
          />

          {/* Profile (logged-in) */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={user} need="Minimal">
                <AgentProfile user={user} /> {/* OK even if user is null */}
              </ProtectedRoute>
            }
          />

          {/* default */}
          <Route
            path="*"
            element={<Navigate to={user ? "/home" : "/login"} replace />}
          />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
