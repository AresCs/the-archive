import { useEffect, useState, useCallback, useMemo } from "react";
import type { Person } from "../../types";
import "./SearchPage.css";
import NewEntryForm from "../NewEntryForm/NewEntryForm";
import PersonDetails from "../PersonDetails/PersonDetails";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

type PersonResult = Person & { related_reports?: string[] };

// ---- read current agent from localStorage ----
type AgentLite = { id?: number; name?: string; username?: string; display_name?: string };
function getCurrentAgent(): AgentLite | null {
  try {
    const raw = localStorage.getItem("agent");
    if (!raw) return null;
    return JSON.parse(raw) as AgentLite;
  } catch {
    return null;
  }
}
function agentDisplay(a: AgentLite | null): string | undefined {
  if (!a) return undefined;
  return a.name || a.display_name || a.username || (a.id ? `Agent#${a.id}` : undefined);
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = (searchParams.get("query") ?? "").trim();
  const [query, setQuery] = useState<string>(initialQuery);

  const [results, setResults] = useState<PersonResult[]>([]);
  const [editingPerson, setEditingPerson] = useState<Partial<Person> | null>(null);
  const [viewingPerson, setViewingPerson] = useState<Person | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const getAge = (dob?: string) => {
    if (!dob) return "Unknown";
    const birthDate = new Date(dob);
    return new Date().getFullYear() - birthDate.getFullYear();
  };

  const loadAll = useCallback(async () => {
    setSearching(true);
    try {
      const data = await api.get<{ results?: PersonResult[] } | PersonResult[]>("/api/all");
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const searchPeople = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        await loadAll();
        return;
      }
      setSearching(true);
      try {
        const data = await api.post<{ results?: PersonResult[] }>("/api/search", { query: trimmed });
        setResults(Array.isArray(data?.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [loadAll]
  );

  useEffect(() => {
    if (initialQuery) {
      if (initialQuery !== query) setQuery(initialQuery);
      void searchPeople(initialQuery);
    } else {
      void loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = (searchParams.get("query") ?? "").trim();
    if (q !== query) setQuery(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const trimmed = query.trim();
    const t = setTimeout(() => {
      if (trimmed) void searchPeople(trimmed);
      else void loadAll();
      setSearchParams((sp) => {
        if (trimmed) sp.set("query", trimmed);
        else sp.delete("query");
        return sp;
      });
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchPeople, loadAll, setSearchParams]);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/api/delete/${id}`);
      setResults((prev) => prev.filter((p) => p.id !== id));
      setViewingPerson(null);
    } catch {
      alert("Failed to delete entry.");
    }
  };

  // ✅ Stamp created_by / updated_by / last_updated
  const saveEntry = async (newEntry: Person) => {
    const isEditingExisting = Boolean(editingPerson?.id);
    const idToUpdate =
      (editingPerson?.id as number | undefined) ?? (newEntry.id as number | undefined);

    const agent = getCurrentAgent();
    const actor = agentDisplay(agent);
    const nowIso = new Date().toISOString();

    const base: Record<string, unknown> = { ...(newEntry as unknown as Record<string, unknown>) };

    let payload: Record<string, unknown>;
    if (isEditingExisting && idToUpdate != null) {
      payload = {
        ...base,
        id: idToUpdate,
        updated_by_id: agent?.id ?? undefined,
        updated_by: actor ?? undefined,
        last_updated: nowIso,
      };
    } else {
      payload = {
        ...base,
        created_by_id: agent?.id ?? undefined,
        created_by: actor ?? undefined,
        last_updated: nowIso,
      };
    }

    try {
      if (isEditingExisting && idToUpdate != null) {
        const { person: entry } = await api.put<{ person: Person }>(`/api/update/${idToUpdate}`, payload);
        setResults((prev) => prev.map((p) => (p.id === entry.id ? entry : p)));
      } else {
        const { person: entry } = await api.post<{ person: Person }>("/api/create", payload);
        setResults((prev) => [...prev, entry]);
      }
      setEditingPerson(null);
    } catch {
      alert("Failed to save entry.");
    }
  };

  const sortedResults = useMemo(
    () => [...results].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [results]
  );

  useEffect(() => {
    if (confirmDeleteId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDeleteId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDeleteId]);

  const showEmpty = !searching && query.trim().length > 0 && sortedResults.length === 0;

  return (
    <div className="search-container">
      <MatrixCanvas />
      <div className="search-box">
        {/* Header */}
        <div className="search-header">
          <button className="back-button" onClick={() => navigate("/home")} type="button">
            ← Back
          </button>

          <h1 className="search-title">Search Records</h1>

          <button className="new-button" onClick={() => setEditingPerson({})} type="button">
            + New Entry
          </button>
        </div>

        {/* Search bar */}
        <div className="search-controls">
          <div className="search-bar-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, alias, gang..."
              className="search-input"
              aria-label="Search"
            />
            <button
              onClick={() => void searchPeople(query)}
              className="search-button"
              disabled={searching}
              type="button"
            >
              {searching ? "…" : "→"}
            </button>
          </div>
        </div>

        {/* Results */}
        {sortedResults.length > 0 ? (
          <div className="results-grid">
            {sortedResults.map((person) => (
              <div key={person.id} className="result-card">
                <div className="card-content">
                  <div className="profile-image">
                    <img
                      src={person.image_url?.trim() || "/images/default-profile.jpg"}
                      alt={person.full_name}
                      className="profile-image"
                      loading="lazy"
                    />
                  </div>
                  <h2>{person.full_name}</h2>
                  <p>
                    <strong>Age:</strong> {getAge(person.dob)} yrs
                  </p>
                  <p>
                    <strong>Affiliation:</strong> {person.gang_affiliation || "None"}
                  </p>
                  {/* compact meta */}
                  <p className="card-meta">
                    <small>
                      {person.updated_by
                        ? `Last updated by ${person.updated_by}`
                        : `Created by ${person.created_by || "—"}`}
                    </small>
                  </p>
                </div>
                <button className="view-button" onClick={() => setViewingPerson(person)} type="button">
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          showEmpty && (
            <div className="no-results-container">
              <div className="no-results-message">
                No result was found for <span className="query-highlight">{`"${query}"`}</span>
              </div>
            </div>
          )
        )}

        {/* Modals */}
        {viewingPerson && (
          <PersonDetails
            person={viewingPerson}
            onClose={() => setViewingPerson(null)}
            onDelete={(id: number) => setConfirmDeleteId(id)}
            onEdit={(person) => {
              setEditingPerson(person);
              setViewingPerson(null);
            }}
          />
        )}

        {editingPerson && (
          <div className="SearchPageEdit-overlay">
            <div className="SearchPageEdit-container">
              <h2 className="SearchPageEdit-title">
                {editingPerson.id ? "Edit Subject Record" : "Create New Subject Profile"}
              </h2>
              <NewEntryForm initialData={editingPerson} onClose={() => setEditingPerson(null)} onSubmit={saveEntry} />
            </div>
          </div>
        )}

        {/* Confirm Delete Modal */}
        {confirmDeleteId !== null && (
          <div className="intel-delete-confirm-overlay">
            <div className="intel-delete-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-delete-title">
              <h2 id="confirm-delete-title">Confirm Delete</h2>
              <p>Are you sure you want to delete this subject record?</p>
              <div className="intel-confirm-actions">
                <button
                  type="button"
                  className="modal-btn modal-btn--danger"
                  onClick={() => {
                    void handleDelete(confirmDeleteId);
                    setConfirmDeleteId(null);
                  }}
                >
                  Yes, Delete
                </button>
                <button type="button" className="modal-btn" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
