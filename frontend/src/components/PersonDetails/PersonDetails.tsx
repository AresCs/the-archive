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
  public: 0,
  "agent-only": 1,
  "handler-only": 2,
};

const CLEARANCE_RANK: Record<Clearance, number> = {
  public: 0,
  agent: 1,
  handler: 2,
  omega: 3,
};

function canView(person: Person, viewer: Clearance = "agent") {
  const needed = ACCESS_RANK[person.access_level ?? "public"];
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

  const handleDelete = () => {
    if (person.id !== undefined) onDelete(person.id);
  };

  const lastUpdatedPretty = useMemo(() => {
    if (!person.last_updated) return undefined;
    const d = new Date(person.last_updated);
    return Number.isNaN(d.getTime()) ? person.last_updated : d.toLocaleString();
  }, [person.last_updated]);

  return (
    <div className="person-details-overlay">
      <div className="person-details-container">
        {/* Header */}
        <div className="person-header">
          {person.image_url && <img src={person.image_url} alt={person.full_name} />}
          <div className="person-title-inline">
            <h2>{person.full_name}</h2>
            <div className="flag-container">
              {person.gang_affiliation && (
                <span className="flag flag-gang">{person.gang_affiliation}</span>
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

        {/* Basic Info */}
        <div className="person-section">
          <h3>Basic Info</h3>
          {person.dob && (
            <p>
              <strong>DOB:</strong> {person.dob}
            </p>
          )}
          {person.gender && (
            <p>
              <strong>Gender:</strong> {person.gender}
            </p>
          )}
          {person.nationality && (
            <p>
              <strong>Nationality:</strong> {person.nationality}
            </p>
          )}
          {person.current_address && (
            <p>
              <strong>Address:</strong> {person.current_address}
            </p>
          )}
          <ListRow label="Aliases" items={person.known_aliases} />
        </div>

        {/* Affiliations */}
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
                    <img src={src} alt={`CCTV ${i + 1} for ${person.full_name}`} />
                  </a>
                ))}
              </div>
            ) : (
              <Redacted label="Snapshots" />
            )
          ) : null}

          {/* Intercepted audio */}
          {person.intercepted_audio?.length ? (
            allowed ? (
              <div className="audio-list">
                <strong>Audio:</strong>
                <ul>
                  {person.intercepted_audio.map((src, i) => (
                    <li key={i}>
                      <audio controls src={src}>
                        Your browser does not support the audio element.
                      </audio>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <Redacted label="Audio" />
            )
          ) : null}

          {/* Notes / patterns / blackmail */}
          {person.personality_notes &&
            (allowed ? (
              <p>
                <strong>Notes:</strong> {person.personality_notes}
              </p>
            ) : (
              <Redacted label="Notes" />
            ))}
          {person.behavioral_patterns &&
            (allowed ? (
              <p>
                <strong>Patterns:</strong> {person.behavioral_patterns}
              </p>
            ) : (
              <Redacted label="Patterns" />
            ))}
          {person.blackmail_material &&
            (allowed ? (
              <p>
                <strong>Blackmail:</strong> {person.blackmail_material}
              </p>
            ) : (
              <Redacted label="Blackmail" />
            ))}

          {person.linked_reports?.length
            ? allowed
              ? <ListRow label="Reports" items={person.linked_reports} />
              : <Redacted label="Reports" />
            : null}
        </div>

        {/* Meta */}
        <div className="person-section">
          <h3>Meta</h3>
          {person.created_by && (
            <p>
              <strong>By:</strong> {person.created_by}
            </p>
          )}
          {lastUpdatedPretty && (
            <p>
              <strong>Updated:</strong> {lastUpdatedPretty}
            </p>
          )}
          {person.internal_flags?.length
            ? allowed
              ? <ListRow label="Flags" items={person.internal_flags} />
              : <Redacted label="Flags" />
            : null}
        </div>

        {/* Actions */}
        <div className="person-actions">
          <button className="edit-button" onClick={() => onEdit(person)}>
            Edit
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
