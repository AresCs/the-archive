import { useEffect, useState } from "react";
import type { Person } from "../../types";
import "./NewEntryForm.css";

type Props = {
  initialData: Partial<Person>;
  onClose: () => void;
  onSubmit: (entry: Person) => void;
};

const splitToArray = (value: string): string[] =>
  value
    .split(/[\n,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

const joinMultiline = (arr?: string[]) => (arr && arr.length ? arr.join("\n") : "");

/* ---- Read agent from localStorage & format a display name ---- */
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

/* ---- Time helpers ---- */
function nowIso(): string {
  return new Date().toISOString();
}
function prettyTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export default function NewEntryForm({ initialData, onClose, onSubmit }: Props) {
  const [formData, setFormData] = useState<Partial<Person>>({
    suspected_informant: "unknown",
    ...initialData,
  });

  // Initialize Created By + Last Updated on mount (only if missing)
  useEffect(() => {
    const actor = agentDisplay(getCurrentAgent());
    setFormData((prev) => ({
      ...prev,
      created_by: prev.created_by && prev.created_by.trim() ? prev.created_by : actor,
      last_updated: prev.last_updated || nowIso(),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  const [snapshotsText, setSnapshotsText] = useState<string>(
    joinMultiline(initialData.cctv_snapshots)
  );
  const [audioText, setAudioText] = useState<string>(
    joinMultiline(initialData.intercepted_audio)
  );

  const handleChange = <K extends keyof Person>(key: K, value: Person[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const onSnapshotsChange = (v: string) => {
    setSnapshotsText(v);
    handleChange("cctv_snapshots", splitToArray(v));
  };
  const onAudioChange = (v: string) => {
    setAudioText(v);
    handleChange("intercepted_audio", splitToArray(v));
  };

  const handleSubmit = () => {
    if (!formData.full_name?.trim()) {
      alert("Full Name is required.");
      return;
    }

    const normalized: Person = {
      image_url: formData.image_url || "",
      full_name: formData.full_name!.trim(),
      known_aliases: formData.known_aliases ?? [],
      dob: formData.dob,
      gender: formData.gender,
      nationality: formData.nationality,
      current_address: formData.current_address,
      gang_affiliation: formData.gang_affiliation,

      known_associates: formData.known_associates ?? [],
      organization_ties: formData.organization_ties ?? [],
      recent_contacts: formData.recent_contacts ?? [],
      suspected_informant: formData.suspected_informant ?? ("unknown" as const),

      last_known_location: formData.last_known_location,
      known_vehicles: formData.known_vehicles ?? [],
      radio_frequencies: formData.radio_frequencies ?? [],
      tracked_devices: formData.tracked_devices ?? [],
      recent_movements: formData.recent_movements ?? [],

      cctv_snapshots: splitToArray(snapshotsText),
      intercepted_audio: splitToArray(audioText),

      personality_notes: formData.personality_notes,
      behavioral_patterns: formData.behavioral_patterns,
      blackmail_material: formData.blackmail_material,
      linked_reports: formData.linked_reports ?? [],

      // created_by is auto-filled; last_updated is always stamped "now"
      created_by: formData.created_by,
      last_updated: nowIso(),
      internal_flags: formData.internal_flags ?? [],
      access_level: formData.access_level ?? "minimal",
      updated_by: formData.updated_by || "",
    };

    onSubmit(normalized);
  };

  return (
    <form
      className="NewEntryForm"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="columns-wrapper">
        {/* === Column 1 === */}
        <div className="entry-column">
          <h3>Basic Information</h3>

          <div className="input-group">
            <label htmlFor="image_url">Image URL</label>
            <input
              id="image_url"
              value={formData.image_url || ""}
              onChange={(e) => handleChange("image_url", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="full_name">Full Name</label>
            <input
              id="full_name"
              value={formData.full_name || ""}
              onChange={(e) => handleChange("full_name", e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="dob">Date of Birth</label>
            <input
              id="dob"
              type="date"
              value={formData.dob || ""}
              onChange={(e) => handleChange("dob", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="gender">Gender</label>
            <input
              id="gender"
              value={formData.gender || ""}
              onChange={(e) => handleChange("gender", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="nationality">Nationality</label>
            <input
              id="nationality"
              value={formData.nationality || ""}
              onChange={(e) => handleChange("nationality", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="current_address">Current Address</label>
            <input
              id="current_address"
              value={formData.current_address || ""}
              onChange={(e) => handleChange("current_address", e.target.value)}
            />
          </div>

          <h3>Affiliations</h3>

          <div className="input-group">
            <label htmlFor="gang_affiliation">Gang Affiliation</label>
            <input
              id="gang_affiliation"
              value={formData.gang_affiliation || ""}
              onChange={(e) => handleChange("gang_affiliation", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="known_aliases">Known Aliases</label>
            <textarea
              id="known_aliases"
              placeholder="Comma or newline separated"
              value={(formData.known_aliases || []).join(", ")}
              onChange={(e) => handleChange("known_aliases", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label htmlFor="known_associates">Known Associates</label>
            <textarea
              id="known_associates"
              placeholder="Comma or newline separated"
              value={(formData.known_associates || []).join(", ")}
              onChange={(e) => handleChange("known_associates", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label htmlFor="organization_ties">Organization Ties</label>
            <textarea
              id="organization_ties"
              placeholder="Comma or newline separated"
              value={(formData.organization_ties || []).join(", ")}
              onChange={(e) => handleChange("organization_ties", splitToArray(e.target.value))}
            />
          </div>
        </div>

        {/* === Column 2 === */}
        <div className="entry-column">
          <h3>Contacts</h3>

          <div className="input-group">
            <label htmlFor="recent_contacts">Recent Contacts</label>
            <textarea
              id="recent_contacts"
              placeholder="Comma or newline separated"
              value={(formData.recent_contacts || []).join(", ")}
              onChange={(e) => handleChange("recent_contacts", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label htmlFor="suspected_informant">Suspected Informant</label>
            <select
              id="suspected_informant"
              value={formData.suspected_informant || "unknown"}
              onChange={(e) =>
                handleChange("suspected_informant", e.target.value as "yes" | "no" | "unknown")
              }
            >
              <option value="unknown">Unknown</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <h3>Tracking & Surveillance</h3>

          <div className="input-group">
            <label htmlFor="last_known_location">Last Known Location</label>
            <input
              id="last_known_location"
              value={formData.last_known_location || ""}
              onChange={(e) => handleChange("last_known_location", e.target.value)}
            />
          </div>

          <h3>Known Vehicles</h3>
          <div className="vehicle-list">
            {(formData.known_vehicles || []).map((v, index) => (
              <div key={index} className="vehicle-row">
                {(["make", "model", "color", "plate"] as const).map((field) => (
                  <input
                    key={field}
                    placeholder={field[0].toUpperCase() + field.slice(1)}
                    value={v[field] || ""}
                    onChange={(e) => {
                      const updated = [...(formData.known_vehicles || [])];
                      updated[index] = { ...updated[index], [field]: e.target.value };
                      handleChange("known_vehicles", updated);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="NewEntryForm-delete-vehicle"
                  onClick={() => {
                    const updated = [...(formData.known_vehicles || [])];
                    updated.splice(index, 1);
                    handleChange("known_vehicles", updated);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="NewEntryForm-add-vehicle"
              onClick={() =>
                handleChange("known_vehicles", [
                  ...(formData.known_vehicles || []),
                  { make: "", model: "", color: "", plate: "" },
                ])
              }
            >
              + Add Vehicle
            </button>
          </div>

          <div className="input-group">
            <label htmlFor="radio_frequencies">Radio Frequencies</label>
            <textarea
              id="radio_frequencies"
              placeholder="Comma or newline separated (e.g. 89.1, 101.3/secure)"
              value={(formData.radio_frequencies || []).join(", ")}
              onChange={(e) => handleChange("radio_frequencies", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label htmlFor="tracked_devices">Tracked Devices</label>
            <textarea
              id="tracked_devices"
              placeholder="Comma or newline separated"
              value={(formData.tracked_devices || []).join(", ")}
              onChange={(e) => handleChange("tracked_devices", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label htmlFor="recent_movements">Recent Movements</label>
            <textarea
              id="recent_movements"
              placeholder="Comma or newline separated"
              value={(formData.recent_movements || []).join(", ")}
              onChange={(e) => handleChange("recent_movements", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group">
            <label htmlFor="cctv_snapshots">CCTV Snapshots</label>
            <textarea
              id="cctv_snapshots"
              rows={5}
              wrap="soft"
              value={snapshotsText}
              onChange={(e) => onSnapshotsChange(e.target.value)}
              placeholder={"One URL per line\nhttps://example/a.jpg\nhttps://example/b.jpg"}
            />
          </div>

          <div className="input-group">
            <label htmlFor="intercepted_audio">Intercepted Audio</label>
            <textarea
              id="intercepted_audio"
              rows={5}
              wrap="soft"
              value={audioText}
              onChange={(e) => onAudioChange(e.target.value)}
              placeholder={"One URL per line\nhttps://example/a.ogg\nhttps://example/b.ogg"}
            />
          </div>
        </div>

        {/* === Column 3 === */}
        <div className="entry-column">
          <h3>Behavioral Data</h3>

          <div className="input-group">
            <label htmlFor="personality_notes">Personality Notes</label>
            <textarea
              id="personality_notes"
              value={formData.personality_notes || ""}
              onChange={(e) => handleChange("personality_notes", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="behavioral_patterns">Behavioral Patterns</label>
            <textarea
              id="behavioral_patterns"
              value={formData.behavioral_patterns || ""}
              onChange={(e) => handleChange("behavioral_patterns", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="blackmail_material">Blackmail Material</label>
            <textarea
              id="blackmail_material"
              value={formData.blackmail_material || ""}
              onChange={(e) => handleChange("blackmail_material", e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="linked_reports">Linked Reports</label>
            <textarea
              id="linked_reports"
              placeholder="Comma or newline separated"
              value={(formData.linked_reports || []).join(", ")}
              onChange={(e) => handleChange("linked_reports", splitToArray(e.target.value))}
            />
          </div>

          <h3>Metadata</h3>

          {/* Created By (auto-filled and read-only) */}
          <div className="input-group">
            <label htmlFor="created_by">Created By</label>
            <input
              id="created_by"
              value={formData.created_by || ""}
              readOnly
              disabled
              title="Auto-filled from your login"
            />
          </div>

          {/* Last Updated (auto-stamped, read-only) */}
          <div className="input-group">
            <label htmlFor="last_updated">Last Updated</label>
            <input
              id="last_updated"
              value={prettyTime(formData.last_updated)}
              readOnly
              disabled
              title="Auto-stamped from your computer time"
            />
          </div>

          <div className="input-group">
            <label htmlFor="internal_flags">Internal Flags</label>
            <textarea
              id="internal_flags"
              placeholder="Comma or newline separated"
              value={(formData.internal_flags || []).join(", ")}
              onChange={(e) => handleChange("internal_flags", splitToArray(e.target.value))}
            />
          </div>

          <div className="input-group checkbox-label">
            <input
              type="checkbox"
              checked={(formData.internal_flags || []).includes("Person of Interest")}
              onChange={(e) => {
                const flags = new Set(formData.internal_flags || []);
                if (e.target.checked) flags.add("Person of Interest");
                else flags.delete("Person of Interest");
                handleChange("internal_flags", Array.from(flags));
              }}
            />
            Mark as Person of Interest
          </div>

          <div className="input-group">
            <label htmlFor="access_level">Access Level</label>
            <select
              id="access_level"
              value={formData.access_level || ""}
              onChange={(e) =>
                handleChange(
                  "access_level",
                  e.target.value as
                    | "minimal"
                    | "confidential"
                    | "restricted"
                    | "classified"
                    | "operational"
                    | "topsecret"
                    | "redline"
                )
              }
            >
              <option value="">-- Select Access Level --</option>
              <option value="minimal">Minimal</option>
              <option value="confidential">Confidential</option>
              <option value="restricted">Restricted</option>
              <option value="classified">Classified</option>
              <option value="operational">Operational</option>
              <option value="topsecret">Top Secret</option>
              <option value="redline">Redline</option>
            </select>
          </div>
        </div>
      </div>

      {/* === Buttons === */}
      <div className="NewEntryForm-actions">
        <button type="submit" className="NewEntryForm-submit-button">
          Submit
        </button>
        <button type="button" className="NewEntryForm-cancel-button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
