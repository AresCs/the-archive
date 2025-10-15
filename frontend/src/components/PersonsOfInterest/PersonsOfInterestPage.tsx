import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import PersonDetails from "../PersonDetails/PersonDetails";
import { usePeople } from "../../hooks/usePeople";
import { api } from "../../lib/api";
import type { Agent, Person } from "../../types";
import "./PersonsOfInterestPage.css";

export default function PersonsOfInterestPage(): React.ReactElement {
  const navigate = useNavigate();
  const { data: allPeople, loading } = usePeople();

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Read current user from localStorage to gate destructive actions
  const sessionUser: Agent | null = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? (JSON.parse(raw) as Agent) : null;
    } catch {
      return null;
    }
  }, []);
  const canAdminPeople = sessionUser?.clearance === "Redline";

  // Filter only people with the "Person of Interest" internal flag
  const poiPeople = useMemo<Person[]>(() => {
    if (!Array.isArray(allPeople)) return [];
    return allPeople.filter((p) =>
      (p.internal_flags ?? []).includes("Person of Interest")
    );
  }, [allPeople]);

  // Esc to close confirm
  useEffect(() => {
    if (confirmDeleteId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmDeleteId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDeleteId]);

  const handleDelete = async (id: number): Promise<void> => {
    if (!canAdminPeople) {
      alert("Redline clearance required to delete subjects.");
      return;
    }
    try {
      await api.delete(`/api/delete/${id}`);
      setSelectedPerson(null);
      // Optimistic: usePeople hook should revalidate; this clears local selection.
    } catch {
      alert("Failed to delete entry.");
    }
  };

  const getPrimaryAlias = (aliases?: string[]): string =>
    aliases && aliases.length ? aliases[0] : "—";

  return (
    <div className="poi-container">
      <MatrixCanvas />

      {/* Header */}
      <div className="poi-header">
        <button type="button" className="back-button" onClick={() => navigate("/home")}>
          ← Back
        </button>
        <h1 className="poi-title">Persons of Interest</h1>
        <div style={{ width: 160 }} /> {/* spacer to balance header layout */}
      </div>

      {/* Content */}
      {loading ? (
        <div className="poi-empty-message">Loading…</div>
      ) : poiPeople.length === 0 ? (
        <div className="poi-empty-message">No persons of interest at this time.</div>
      ) : (
        <div className="poi-grid">
          {poiPeople.map((person) => (
            <div key={String(person.id ?? person.full_name)} className="poi-card">
              <img
                src={person.image_url?.trim() || "/images/default-profile.jpg"}
                alt={person.full_name}
                className="poi-image"
                loading="lazy"
              />
              <h2 className="poi-name">{person.full_name}</h2>
              <p>
                <strong>Alias:</strong> {getPrimaryAlias(person.known_aliases)}
              </p>
              <p>
                <strong>Affiliation:</strong> {person.gang_affiliation || "None"}
              </p>
              <p>
                <strong>Last Seen:</strong> {person.last_known_location || "Unknown"}
              </p>
              <button
                type="button"
                className="view-button"
                onClick={() => setSelectedPerson(person)}
              >
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Person Details Modal */}
      {selectedPerson && (
        <PersonDetails
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onDelete={(id: number) => setConfirmDeleteId(id)} // UI allows request; server + canAdminPeople guard actual delete
          onEdit={() => {
            // This page is read-focused; if you want edit/create here,
            // you can open your NewEntryForm like on SearchPage.
          }}
        />
      )}

      {/* Confirm Delete */}
      {confirmDeleteId !== null && (
        <div className="intel-delete-confirm-overlay">
          <div
            className="intel-delete-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="poi-confirm-delete-title"
          >
            <h2 id="poi-confirm-delete-title">Confirm Delete</h2>
            <p>Are you sure you want to delete this subject record?</p>
            <div className="intel-confirm-actions">
              <button
                type="button"
                className="modal-btn modal-btn--danger"
                onClick={() => {
                  void handleDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                disabled={!canAdminPeople}
                title={canAdminPeople ? "Delete record" : "Redline required"}
              >
                Yes, Delete
              </button>
              <button
                type="button"
                className="modal-btn"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
