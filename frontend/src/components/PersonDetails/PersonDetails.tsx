import type { Person } from "../../types";
import "./PersonDetails.css";
import { useMemo, useState } from "react";

type Clearance = "public" | "agent" | "handler" | "omega";

interface PersonDetailsProps {
  person: Person;
  onClose: () => void;
  onEdit: (person: Partial<Person>) => void;
  onDelete: (id: number) => void;
  /** The viewing agent's clearance; used to gate sensitive fields. */
  viewerClearance?: Clearance;
}

const ACCESS_RANK: Record<NonNullable<Person["access_level"]>, number> = {
  minimal: 0,
  confidential: 1,
  restricted: 2,
  classified: 3,
  operational: 4,
  topsecret: 5,
  redline: 6,
};

const CLEARANCE_RANK: Record<Clearance, number> = {
  public: 0,
  agent: 1,
  handler: 2,
  omega: 3,
};

function canView(person: Person, viewer: Clearance = "agent") {
  const needed = ACCESS_RANK[person.access_level ?? "minimal"];
  const viewerRank = CLEARANCE_RANK[viewer];
  return viewerRank >= needed;
}

function Redacted({ label }: { label: string }) {
  return (
    <p className="redacted">
      <strong>{label}:</strong> <span className="redacted-bar">REDACTED</span>
    </p>
  );
}

function ListRow({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <p>
      <strong>{label}:</strong> {items.join(", ")}
    </p>
  );
}

export default function PersonDetails({
  person,
  onClose,
  onEdit,
  onDelete,
  viewerClearance = "agent",
}: PersonDetailsProps) {
  const allowed = canView(person, viewerClearance);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // High Priority toggle state & helpers
  const [priorityBusy, setPriorityBusy] = useState(false);

  const isHighPriority = useMemo(
    () =>
      (person.internal_flags ?? []).some(
        (f) => typeof f === "string" && f.toLowerCase() === "high priority"
      ),
    [person.internal_flags]
  );

  async function toggleHighPriority() {
    if (person.id === undefined) return;
    setPriorityBusy(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/people/${person.id}/priority`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ high_priority: !isHighPriority }),
          credentials: "include", // <-- send the session cookie
        }
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: unknown = await res.json();
      if (data && typeof data === "object") {
        const obj = data as Record<string, unknown>;
        if (obj.person && typeof obj.person === "object") {
          onEdit(obj.person as Partial<Person>);
        } else {
          throw new Error("Unexpected response from server.");
        }
      } else {
        throw new Error("Unexpected response from server.");
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        console.error(err);
        alert("Failed to update High Priority.");
      }
    } finally {
      setPriorityBusy(false);
    }
  }

  const handleDelete = () => {
    if (person.id !== undefined) onDelete(person.id);
  };

  const lastUpdatedPretty = useMemo(() => {
    const raw = person.last_updated;
    if (!raw) return undefined;

    // Case 1: date-only (YYYY-MM-DD) -> show just the date
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(`${raw}T00:00:00`); // local midnight; we only display the date
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    // Case 2: full timestamp (with or without zone) -> show local datetime with TZ
    const d = new Date(raw); // keep browser's native handling; no forced UTC
    if (Number.isNaN(d.getTime())) return raw;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: tz,
      timeZoneName: "short",
    });
  }, [person.last_updated]);

  return (
    <div className="person-details-overlay">
      <div className="person-details-container">
        {/* Header */}
        <div className="person-header">
          {person.image_url && (
            <img src={person.image_url} alt={person.full_name} />
          )}
          <div className="person-title-inline">
            <h2>{person.full_name}</h2>
            <div className="flag-container">
              {isHighPriority && (
                <span className="flag flag-danger">High Priority</span>
              )}
              {person.gang_affiliation && (
                <span className="flag flag-gang">
                  {person.gang_affiliation}
                </span>
              )}
              {person.suspected_informant && (
                <span
                  className={`flag ${
                    person.suspected_informant === "yes"
                      ? "flag-danger"
                      : person.suspected_informant === "unknown"
                      ? "flag-warning"
                      : "flag-neutral"
                  }`}
                >
                  Informant: {person.suspected_informant}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Network */}
        <div className="person-section">
          <h3>Network</h3>
          <ListRow label="Associates" items={person.known_associates} />
          <ListRow label="Org Ties" items={person.organization_ties} />
          <ListRow label="Recent Contacts" items={person.recent_contacts} />
        </div>

        {/* Tracking */}
        <div className="person-section">
          <h3>Tracking</h3>
          {person.last_known_location && (
            <p>
              <strong>Location:</strong> {person.last_known_location}
            </p>
          )}

          {/* Vehicles as a compact table */}
          {person.known_vehicles?.length ? (
            <div className="table-wrap">
              <strong>Vehicles:</strong>
              <table className="vehicle-table">
                <thead>
                  <tr>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Color</th>
                    <th>Plate</th>
                  </tr>
                </thead>
                <tbody>
                  {person.known_vehicles.map((v, idx) => (
                    <tr key={idx}>
                      <td>{v.make}</td>
                      <td>{v.model}</td>
                      <td>{v.color}</td>
                      <td>{v.plate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <ListRow label="Frequencies" items={person.radio_frequencies} />
          <ListRow label="Devices" items={person.tracked_devices} />
          <ListRow label="Movements" items={person.recent_movements} />
        </div>

        {/* Intel */}
        <div className="person-section">
          <h3>Intel</h3>

          {/* CCTV gallery with hover-to-full preview */}
          {person.cctv_snapshots?.length ? (
            allowed ? (
              <div className="media-grid">
                {person.cctv_snapshots.map((src, i) => (
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    key={i}
                    className="media-thumb"
                    onMouseEnter={() => setPreviewUrl(src)}
                    onMouseLeave={() => setPreviewUrl(null)}
                    onFocus={() => setPreviewUrl(src)}
                    onBlur={() => setPreviewUrl(null)}
                    title="Open full image in new tab"
                  >
                    <img
                      src={src}
                      alt={`CCTV ${i + 1} for ${person.full_name}`}
                    />
                  </a>
                ))}
              </div>
            ) : (
              <Redacted label="Snapshots" />
            )
          ) : null}

          {/* Audio clips (links) */}
          {person.intercepted_audio?.length ? (
            allowed ? (
              <ul className="audio-list">
                {person.intercepted_audio.map((src, i) => (
                  <li key={i}>
                    <a href={src} target="_blank" rel="noreferrer">
                      Audio {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Redacted label="Audio" />
            )
          ) : null}

          {/* Blackmail material */}
          {person.blackmail_material ? (
            allowed ? (
              <p>
                <strong>Blackmail:</strong> {person.blackmail_material}
              </p>
            ) : (
              <Redacted label="Blackmail" />
            )
          ) : null}

          {/* Linked reports */}
          {person.linked_reports?.length ? (
            <p>
              <strong>Reports:</strong> {person.linked_reports.join(", ")}
            </p>
          ) : null}
        </div>

        {/* Meta */}
        <div className="person-section">
          <h3>Meta</h3>
          {person.created_by && (
            <p>
              <strong>Created by:</strong> {person.created_by}
            </p>
          )}
          {person.updated_by && (
            <p>
              <strong>Last updated by:</strong> {person.updated_by}
            </p>
          )}
          {lastUpdatedPretty && (
            <p>
              <strong>Last updated:</strong> {lastUpdatedPretty}
            </p>
          )}

          {isHighPriority && person.high_priority_at && (
            <p>
              <strong>High Priority Since:</strong>{" "}
              {new Date(person.high_priority_at).toLocaleString()}
            </p>
          )}
          {person.internal_flags?.length ? (
            allowed ? (
              <ListRow label="Flags" items={person.internal_flags} />
            ) : (
              <Redacted label="Flags" />
            )
          ) : null}
        </div>

        {/* Actions */}
        <div className="person-actions">
          <button className="edit-button" onClick={() => onEdit(person)}>
            Edit
          </button>
          <button
            className={`priority-button ${isHighPriority ? "on" : ""}`}
            onClick={toggleHighPriority}
            disabled={person.id === undefined || priorityBusy}
            title={
              isHighPriority ? "Unmark High Priority" : "Mark High Priority"
            }
            aria-pressed={isHighPriority}
            aria-busy={priorityBusy}
          >
            {priorityBusy
              ? "Saving…"
              : isHighPriority
              ? "Unmark High Priority"
              : "Mark High Priority"}
          </button>
          <button
            className="delete-button"
            onClick={handleDelete}
            disabled={person.id === undefined}
          >
            Delete
          </button>
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Fullscreen hover preview (visual-only; doesn’t swallow clicks) */}
      {previewUrl && (
        <div className="image-preview-overlay">
          <img src={previewUrl} alt="Preview" />
        </div>
      )}
    </div>
  );
}
