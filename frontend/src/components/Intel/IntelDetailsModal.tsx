import { useEffect, useRef, memo, useMemo } from "react";
import ReactDOM from "react-dom";
import type { IntelDoc } from "./IntelFiles.types";

const defaultFmtDate = (s?: string): string | undefined => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
};

type Props = {
  intel: IntelDoc;
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNavigateReport: (reportIdOrTitle: string) => void;
  onNavigatePerson: (name: string) => void;
  /** Optional date formatter injected by parent for consistency. */
  fmtDate?: (s?: string) => string | undefined;
};

/** Normalize possibly-comma-separated strings or arrays into a trimmed string[] */
const toList = (v?: string[] | string | null): string[] => {
  if (Array.isArray(v)) {
    return v.map((x) => x?.toString().trim()).filter((x) => x.length > 0);
  }
  if (typeof v === "string") {
    return v
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
  }
  return [];
};

function CsvLinks({
  items,
  onClick,
  "aria-label": ariaLabel,
}: {
  items: string[];
  onClick: (val: string) => void;
  "aria-label"?: string;
}) {
  if (items.length === 0) return <span className="intel-detail-kv-val">—</span>;
  return (
    <span className="intel-detail-kv-val" aria-label={ariaLabel}>
      {items.map((val, idx) => (
        <span key={`${val}-${idx}`}>
          <button
            type="button"
            className="intel-link"
            onClick={() => onClick(val)}
            aria-label={`${ariaLabel ?? "navigate"}: ${val}`}
          >
            {val}
          </button>
          {idx < items.length - 1 ? <span>{", "}</span> : null}
        </span>
      ))}
    </span>
  );
}

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

  // Close on Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close on overlay click
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) onClose();
    };
    const node = overlayRef.current;
    node?.addEventListener("click", handler);
    return () => node?.removeEventListener("click", handler);
  }, [onClose]);

  const persons = toList(intel.linked_persons as unknown as string[] | string);
  const reports = toList(intel.linked_reports as unknown as string[] | string);

  return ReactDOM.createPortal(
    <div
      className="intel-detail-overlay"
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
    >
      <div className="intel-detail-modal">
        {/* Title */}
        <h2 className="intel-detail-title">{intel.title || "Untitled Report"}</h2>

        {/* Two-column content */}
        <div className="intel-detail-grid">
          {/* Left column: Summary & Links */}
          <section className="intel-detail-section">
            <h3 className="intel-detail-section-title">Summary</h3>
            <div className="intel-detail-kv">
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Summary</div>
                <div className="intel-detail-kv-val">{intel.summary || "—"}</div>
              </div>

              {(reports.length > 0 || persons.length > 0) && (
                <div className="intel-detail-kv-row">
                  <div className="intel-detail-kv-key">Links</div>
                  <div className="intel-detail-kv-val">
                    {/* Reports (comma-separated clickable) */}
                    <div style={{ marginBottom: persons.length ? "0.5rem" : 0 }}>
                      <strong>Reports</strong>:{" "}
                      <CsvLinks
                        items={reports}
                        onClick={onNavigateReport}
                        aria-label="navigate report"
                      />
                    </div>

                    {/* Persons (comma-separated clickable) */}
                    <div>
                      <strong>Persons</strong>:{" "}
                      <CsvLinks
                        items={persons}
                        onClick={onNavigatePerson}
                        aria-label="navigate person"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right column: Source / Classification / Meta */}
          <section className="intel-detail-section">
            <h3 className="intel-detail-section-title">Source & Classification</h3>
            <div className="intel-detail-kv">
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Source</div>
                <div className="intel-detail-kv-val">{intel.source || "—"}</div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Collection</div>
                <div className="intel-detail-kv-val">
                  {intel.collection_method || "—"}
                </div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Class</div>
                <div className="intel-detail-kv-val">
                  {intel.classification || "—"}
                </div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Operation</div>
                <div className="intel-detail-kv-val">
                  {intel.operation_code || "—"}
                </div>
              </div>
              <div className="intel-detail-kv-row">
                <div className="intel-detail-kv-key">Status</div>
                <div className="intel-detail-kv-val">{intel.status || "—"}</div>
              </div>

              {(intel.created_by || intel.last_updated) && (
                <>
                  <div className="intel-detail-kv-row">
                    <div className="intel-detail-kv-key">Created by</div>
                    <div className="intel-detail-kv-val">
                      {intel.created_by || "—"}
                    </div>
                  </div>
                  <div className="intel-detail-kv-row">
                    <div className="intel-detail-kv-key">Updated</div>
                    <div className="intel-detail-kv-val">
                      {format(intel.last_updated) || "—"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="intel-detail-actions">
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
      </div>
    </div>,
    document.body
  );
});

export default IntelDetailsModal;
