import { useEffect, useRef, memo, useMemo, useState } from "react";
import ReactDOM from "react-dom";
import type { IntelDoc } from "./IntelFiles.types";

/** ---------- Utilities (no `any`) ---------- */

const defaultFmtDate = (s?: string): string | undefined => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
};

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
      .filter((v) => v.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
};

const propString = (obj: unknown, key: string): string | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
};

const propFlags = (obj: unknown): string[] => {
  if (!obj || typeof obj !== "object") return [];
  const v = (obj as Record<string, unknown>)["internal_flags"];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
};

const setFlagsOn = (rec: IntelDoc, nextFlags: string[]): IntelDoc => {
  const copy = { ...rec } as Record<string, unknown>;
  copy["internal_flags"] = nextFlags;
  return copy as IntelDoc;
};

const eqFlag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const isHP = (f: string) => eqFlag(f, "High Priority");

type IntelEntryResponse = { entry: IntelDoc };

const isIntelEntryResponse = (j: unknown): j is IntelEntryResponse => {
  if (!j || typeof j !== "object") return false;
  const entry = (j as Record<string, unknown>)["entry"];
  if (!entry || typeof entry !== "object") return false;
  const id = (entry as Record<string, unknown>)["id"];
  return typeof id === "number";
};

/** ---------- CSV Link helper ---------- */
function CsvLinks({
  items,
  onClick,
  ...rest
}: {
  items: string[];
  onClick: (s: string) => void;
  "aria-label"?: string;
}) {
  if (!items.length) return <span>—</span>;
  return (
    <span className="csv-links" {...rest}>
      {items.map((s, i) => (
        <span
          key={`${s}-${i}`}
          onClick={() => onClick(s)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick(s)}
          className="csv-link"
        >
          {s}
          {i < items.length - 1 ? ", " : ""}
        </span>
      ))}
    </span>
  );
}

/** ---------- Component ---------- */

type Props = {
  intel: IntelDoc;               // initial intel (used for id & initial render)
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;            // you already have this; we keep it as-is
  onNavigateReport: (reportIdOrTitle: string) => void;
  onNavigatePerson: (name: string) => void;
  fmtDate?: (s?: string) => string | undefined;
};

const IntelDetailsModal = memo(function IntelDetailsModal({
  intel,
  onClose,
  onDelete,
  onEdit,
  onNavigateReport,
  onNavigatePerson,
  fmtDate,
}: Props) {
  const format = useMemo<(s?: string) => string | undefined>(
    () => fmtDate ?? defaultFmtDate,
    [fmtDate]
  );

  /** Backend source-of-truth */
  const [record, setRecord] = useState<IntelDoc>(intel);
  const [loading, setLoading] = useState(false);
  const [flagBusy, setFlagBusy] = useState(false);
  const [hpBusy, setHpBusy] = useState(false);

  const refresh = async () => {
    if (intel.id === undefined) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/intel/${intel.id}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const json: unknown = await res.json();
      if (isIntelEntryResponse(json)) {
        setRecord(json.entry);
      } else {
        throw new Error("Unexpected response shape.");
      }
    } finally {
      setLoading(false);
    }
  };

  /** Load current backend state on open (and when id changes) */
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intel.id]);

  /** Derive view data from the backend record */
  const flags = useMemo(() => propFlags(record), [record]);
  const isHighPriority = useMemo(() => flags.some(isHP), [flags]);
  const highPriorityAt = useMemo(
    () => propString(record, "high_priority_at"),
    [record]
  );

  const persons = useMemo(
    () => toList((record as unknown as Record<string, unknown>)["linked_persons"]),
    [record]
  );
  const reports = useMemo(
    () => toList((record as unknown as Record<string, unknown>)["linked_reports"]),
    [record]
  );

  /** Actions */
  const toggleHighPriority = async () => {
    if (record.id === undefined) return;
    setHpBusy(true);
    try {
      const res = await fetch(
        `http://localhost:8000/api/intel/${record.id}/priority`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ high_priority: !isHighPriority }),
        }
      );
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await refresh(); // pull canonical state from backend
    } catch (e) {
      console.error(e);
      alert("Failed to update High Priority.");
    } finally {
      setHpBusy(false);
    }
  };

  const addFlag = async (newFlag: string) => {
    const flag = newFlag.trim();
    if (!flag || record.id === undefined) return;

    if (isHP(flag)) {
      await toggleHighPriority();
      return;
    }

    const nextFlags = Array.from(new Set([...flags, flag]));
    setFlagBusy(true);
    try {
      const res = await fetch(`http://localhost:8000/api/intel/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setFlagsOn(record, nextFlags)),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to add flag.");
    } finally {
      setFlagBusy(false);
    }
  };

  const removeFlag = async (flag: string) => {
    if (record.id === undefined) return;

    if (isHP(flag)) {
      // unmark via dedicated endpoint so high_priority_at clears server-side
      setFlagBusy(true);
      try {
        const res = await fetch(
          `http://localhost:8000/api/intel/${record.id}/priority`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ high_priority: false }),
          }
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        await refresh();
      } catch (e) {
        console.error(e);
        alert("Failed to unmark High Priority.");
      } finally {
        setFlagBusy(false);
      }
      return;
    }

    const nextFlags = flags.filter((f) => !eqFlag(f, flag));
    setFlagBusy(true);
    try {
      const res = await fetch(`http://localhost:8000/api/intel/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setFlagsOn(record, nextFlags)),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to remove flag.");
    } finally {
      setFlagBusy(false);
    }
  };

  /** Close on Esc */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /** Close on overlay click */
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === el) onClose();
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="intel-detail-overlay" ref={overlayRef} aria-modal="true">
      <div className="intel-detail-modal">
        {/* Title */}
        <h2 className="intel-detail-title">
          {record.title || `Intel ${record.id}`}
        </h2>

        {/* Two-column content */}
        <div className="intel-detail-grid">
          {/* Left: Summary & Links */}
          <section className="intel-detail-section">
            <h3 className="intel-detail-section-title">Summary</h3>
            <div className="intel-detail-kv">
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Summary</div>
                <div className="intel-detail-kv-val">
                  {propString(record, "summary") || "—"}
                </div>
              </div>

              {(reports.length > 0 || persons.length > 0) && (
                <div className="intel-detail-kv-row">
                  <div className="intel-detail-kv-key">Links</div>
                  <div className="intel-detail-kv-val">
                    <div style={{ marginBottom: persons.length ? "0.5rem" : 0 }}>
                      <strong>Reports</strong>:{" "}
                      <CsvLinks items={reports} onClick={onNavigateReport} />
                    </div>
                    <div>
                      <strong>Persons</strong>:{" "}
                      <CsvLinks items={persons} onClick={onNavigatePerson} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right: Details & Flags */}
          <section className="intel-detail-section">
            <h3 className="intel-detail-section-title">Details</h3>
            <div className="intel-detail-kv">
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Source</div>
                <div className="intel-detail-kv-val">
                  {propString(record, "source") || "—"}
                </div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Collection</div>
                <div className="intel-detail-kv-val">
                  {propString(record, "collection_method") || "—"}
                </div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Operation</div>
                <div className="intel-detail-kv-val">
                  {propString(record, "operation_code") || "—"}
                </div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Status</div>
                <div className="intel-detail-kv-val">
                  {propString(record, "status") || "—"}
                </div>
              </div>

              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">High Priority Since</div>
                <div className="intel-detail-kv-val">
                  {isHighPriority && highPriorityAt
                    ? new Date(highPriorityAt).toLocaleString()
                    : "—"}
                </div>
              </div>

              {(propString(record, "created_by") ||
                propString(record, "last_updated")) && (
                <>
                  <div className="intel-detail-kv-row">
                    <div className="intel-detail-kv-key">Created by</div>
                    <div className="intel-detail-kv-val">
                      {propString(record, "created_by") || "—"}
                    </div>
                  </div>
                  <div className="intel-detail-kv-row">
                    <div className="intel-detail-kv-key">Updated</div>
                    <div className="intel-detail-kv-val">
                      {format(propString(record, "last_updated")) || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Flags box */}
            <div className="intel-flags-box" style={{ marginTop: "1rem" }}>
              <div
                className="intel-detail-section-title"
                style={{ marginBottom: "0.25rem" }}
              >
                Flags
              </div>

              {/* Chips */}
              <div
                className="flag-chips"
                style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
              >
                {flags.length === 0 ? (
                  <span className="text-sm opacity-70">—</span>
                ) : (
                  flags.map((f) => (
                    <span
                      key={f}
                      className={`chip ${isHP(f) ? "chip-danger" : "chip-neutral"}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "999px",
                        border: "1px solid #ddd",
                        fontSize: "12px",
                        background: isHP(f) ? "#fecaca" : "#f3f4f6",
                      }}
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => void removeFlag(f)}
                        disabled={flagBusy}
                        title={`Remove ${f}`}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          lineHeight: 1,
                          padding: 0,
                        }}
                        aria-label={`Remove ${f}`}
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add flag */}
              <AddFlagRow
                disabled={flagBusy}
                onAdd={(f) => void addFlag(f)}
              />

              {/* Quick HP toggle */}
              <div style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => void toggleHighPriority()}
                  disabled={hpBusy}
                  title={isHighPriority ? "Unmark High Priority" : "Mark High Priority"}
                  style={{
                    borderRadius: 6,
                    padding: "0.35rem 0.7rem",
                    border: "1px solid #b91c1c",
                    background: isHighPriority ? "#ef4444" : "#fee2e2",
                    color: isHighPriority ? "#fff" : "#7f1d1d",
                  }}
                >
                  {hpBusy
                    ? "Saving…"
                    : isHighPriority
                    ? "Unmark High Priority"
                    : "Mark High Priority"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="intel-detail-actions" style={{ marginTop: "1rem" }}>
          <button type="button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" onClick={onDelete}>
            Delete
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && (
          <div className="text-xs opacity-70" style={{ marginTop: "0.5rem" }}>
            Refreshing from server…
          </div>
        )}
      </div>
    </div>,
    document.body
  );
});

function AddFlagRow({
  disabled,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: (flag: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a flag (e.g., High Priority)"
        disabled={disabled}
        style={{
          flex: "1 1 auto",
          border: "1px solid #ddd",
          borderRadius: 6,
          padding: "0.35rem 0.5rem",
        }}
      />
      <button
        type="button"
        onClick={() => {
          const f = text.trim();
          if (!f) return;
          setText("");
          onAdd(f);
        }}
        disabled={disabled || !text.trim()}
        style={{ borderRadius: 6, padding: "0.35rem 0.7rem", border: "1px solid #ccc" }}
        title="Add flag"
      >
        {disabled ? "Saving…" : "Add"}
      </button>
    </div>
  );
}

export default IntelDetailsModal;
