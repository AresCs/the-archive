import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  type ComponentType,
} from "react";
import MatrixCanvas from "../MatrixCanvas/MatrixCanvas";
import "./IntelFilesPage.css";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import IntelDetailsModal from "./IntelDetailsModal";
import NewReportModal from "./NewReportModal";
import EditReportModal from "./EditReportModal";
import type { IntelDoc } from "./IntelFiles.types";

/* ---------- helpers ---------- */
const fmtDate = (s?: string): string | undefined => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString();
};

const toLines = (input: string): string[] =>
  input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

const toCsv = (arr?: string[]): string =>
  arr && arr.length ? arr.join(", ") : "";

const NewReportModalShim = NewReportModal as unknown as ComponentType<
  Record<string, unknown>
>;
const EditReportModalShim = EditReportModal as unknown as ComponentType<
  Record<string, unknown>
>;

/* ---------- component ---------- */
export default function IntelFilesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [intelData, setIntelData] = useState<IntelDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [creatingIntel, setCreatingIntel] = useState(false);
  const [selectedIntel, setSelectedIntel] = useState<IntelDoc | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [editingIntel, setEditingIntel] = useState<IntelDoc | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  /* ====== search state sync ====== */
  const searchQuery = searchParams.get("query") ?? "";
  const setSearchQuery = useCallback(
    (q: string) => {
      const next = new URLSearchParams(searchParams);
      if (q.trim().length > 0) next.set("query", q);
      else next.delete("query");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /* ====== load ====== */
  const loadIntel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<IntelDoc[] | { results?: IntelDoc[] }>(
        "/api/intel"
      );
      const list = Array.isArray(data) ? data : data?.results ?? [];
      const normalized: IntelDoc[] = (Array.isArray(list) ? list : []).map(
        (d) => ({
          ...d,
          title: d.title ?? "",
          summary: d.summary ?? "",
        })
      );
      setIntelData(normalized);
    } catch {
      setError("Failed to load intel.");
      setIntelData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIntel();
  }, [loadIntel]);

  /* ====== client-side filter ====== */
  const filteredIntel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return intelData;
    return intelData.filter((d) => {
      const title = (d.title ?? "").toLowerCase();
      const summary = (d.summary ?? "").toLowerCase();
      const person = (d.linked_persons ?? []).join(" ").toLowerCase();
      const reports = (d.linked_reports ?? []).join(" ").toLowerCase();
      const op = (d.operation_code ?? "").toLowerCase();
      return (
        title.includes(q) ||
        summary.includes(q) ||
        person.includes(q) ||
        reports.includes(q) ||
        op.includes(q)
      );
    });
  }, [intelData, searchQuery]);

  /* ====== Create modal state ====== */
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [linkedPersons, setLinkedPersons] = useState("");
  const [operationCode, setOperationCode] = useState("");
  const [status, setStatus] = useState("Draft");
  const [linkedReports, setLinkedReports] = useState("");
  const [sourceVal, setSourceVal] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("");
  const [classification, setClassification] = useState("");
  const [linkedOrganizations, setLinkedOrganizations] = useState("");
  const [linkedOperations, setLinkedOperations] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [blackmailMaterial, setBlackmailMaterial] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNewIntelSave = useCallback(async () => {
    if (!title.trim()) {
      window.alert("Title is required.");
      return;
    }
    if (!summary.trim()) {
      window.alert("Summary is required.");
      return;
    }

    const newIntel: Omit<IntelDoc, "id"> & Partial<IntelDoc> = {
      title: title.trim(),
      summary: summary.trim(),
      linked_persons: toLines(linkedPersons),
      blackmail_material: blackmailMaterial.trim() || undefined,
      linked_reports: toLines(linkedReports),
      operation_code: operationCode.trim() || undefined,
      status: status || undefined,
      source: sourceVal.trim() || undefined,
      collection_method: collectionMethod.trim() || undefined,
      classification: classification.trim() || undefined,
      linked_organizations: toLines(linkedOrganizations),
      linked_operations: toLines(linkedOperations),
      created_by: createdBy.trim() || undefined,
      last_updated: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      const saved = await api.post<IntelDoc | { entry: IntelDoc }>(
        "/api/intel",
        newIntel
      );
      const raw: IntelDoc =
        "id" in saved ? saved : (saved as { entry: IntelDoc }).entry;
      const doc: IntelDoc = {
        ...raw,
        title: raw.title ?? "",
        summary: raw.summary ?? "",
      };
      setIntelData((prev) => [...prev, doc]);
      setCreatingIntel(false);
      // clear form
      setTitle("");
      setSummary("");
      setLinkedPersons("");
      setOperationCode("");
      setStatus("Draft");
      setLinkedReports("");
      setSourceVal("");
      setCollectionMethod("");
      setClassification("");
      setLinkedOrganizations("");
      setLinkedOperations("");
      setCreatedBy("");
      setBlackmailMaterial("");
    } catch {
      window.alert("Error saving intel.");
    } finally {
      setSubmitting(false);
    }
  }, [
    title,
    summary,
    linkedPersons,
    blackmailMaterial,
    linkedReports,
    operationCode,
    status,
    sourceVal,
    collectionMethod,
    classification,
    linkedOrganizations,
    linkedOperations,
    createdBy,
  ]);

  /* ====== Delete ====== */
  const handleDeleteIntel = useCallback(async (id: number) => {
    try {
      await api.delete<unknown>(`/api/intel/${id}`);
      setIntelData((prev) => prev.filter((entry) => entry.id !== id));
      setSelectedIntel(null);
      setConfirmDeleteId(null);
    } catch {
      window.alert(`Error deleting intel.`);
    }
  }, []);

  /* ====== Edit flow ====== */
  const openEditFromDetails = useCallback(() => {
    if (!selectedIntel) return;
    setETitle(selectedIntel.title ?? "");
    setESummary(selectedIntel.summary ?? "");
    setELinkedPersons(toCsv(selectedIntel.linked_persons));
    setEOperationCode(selectedIntel.operation_code ?? "");
    setEStatus(selectedIntel.status ?? "Draft");
    setELinkedReports(toCsv(selectedIntel.linked_reports));
    setESourceVal(selectedIntel.source ?? "");
    setECollectionMethod(selectedIntel.collection_method ?? "");
    setEClassification(selectedIntel.classification ?? "");
    setELinkedOrganizations(toCsv(selectedIntel.linked_organizations));
    setELinkedOperations(toCsv(selectedIntel.linked_operations));
    setECreatedBy(selectedIntel.created_by ?? "");
    setEBlackmailMaterial(selectedIntel.blackmail_material ?? "");
    setEditingIntel(selectedIntel);
    setSelectedIntel(null);
  }, [selectedIntel]);

  const [eTitle, setETitle] = useState("");
  const [eSummary, setESummary] = useState("");
  const [eLinkedPersons, setELinkedPersons] = useState("");
  const [eOperationCode, setEOperationCode] = useState("");
  const [eStatus, setEStatus] = useState("Draft");
  const [eLinkedReports, setELinkedReports] = useState("");
  const [eSourceVal, setESourceVal] = useState("");
  const [eCollectionMethod, setECollectionMethod] = useState("");
  const [eClassification, setEClassification] = useState("");
  const [eLinkedOrganizations, setELinkedOrganizations] = useState("");
  const [eLinkedOperations, setELinkedOperations] = useState("");
  const [eCreatedBy, setECreatedBy] = useState("");
  const [eBlackmailMaterial, setEBlackmailMaterial] = useState("");

  const saveEdit = useCallback(async () => {
    if (!editingIntel) return;
    const updated: Partial<IntelDoc> = {
      ...editingIntel,
      title: eTitle.trim(),
      summary: eSummary.trim(),
      linked_persons: toLines(eLinkedPersons),
      blackmail_material: eBlackmailMaterial.trim() || undefined,
      linked_reports: toLines(eLinkedReports),
      operation_code: eOperationCode.trim() || undefined,
      status: eStatus || undefined,
      source: eSourceVal.trim() || undefined,
      collection_method: eCollectionMethod.trim() || undefined,
      classification: eClassification.trim() || undefined,
      linked_organizations: toLines(eLinkedOrganizations),
      linked_operations: toLines(eLinkedOperations),
      created_by: eCreatedBy.trim() || undefined,
      last_updated: new Date().toISOString(),
    };

    try {
      setEditSaving(true);
      const saved = await api.put<IntelDoc | { entry: IntelDoc }>(
        `/api/intel/${editingIntel.id}`,
        updated
      );
      const raw: IntelDoc =
        "id" in saved ? saved : (saved as { entry: IntelDoc }).entry;
      const doc: IntelDoc = {
        ...raw,
        title: raw.title ?? "",
        summary: raw.summary ?? "",
      };
      setIntelData((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
      setEditingIntel(null);
    } catch {
      window.alert(`Error saving intel.`);
    } finally {
      setEditSaving(false);
    }
  }, [
    editingIntel,
    eTitle,
    eSummary,
    eLinkedPersons,
    eBlackmailMaterial,
    eLinkedReports,
    eOperationCode,
    eStatus,
    eSourceVal,
    eCollectionMethod,
    eClassification,
    eLinkedOrganizations,
    eLinkedOperations,
    eCreatedBy,
  ]);

  /* ====== sticky top bar ====== */
  const topBarRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const node = topBarRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        node.classList.toggle("intel-top-bar--stuck", !entry.isIntersecting);
      },
      { threshold: [1] }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* ====== Render ====== */
  return (
    <div className="intel-container">
      {/* Background */}
      <div className="intel-background">
        <MatrixCanvas
          paused={
            creatingIntel || selectedIntel !== null || editingIntel !== null
          }
        />
      </div>

      <div className="intel-content">
        {/* Top bar */}
        <div className="intel-top-bar" ref={topBarRef}>
          <div className="intel-header">
            <button
              className="intel-btn intel-btn--back"
              onClick={() => navigate("/home")}
              type="button"
            >
              ← Back
            </button>

            <h1 className="intel-title">Intel Files</h1>

            <button
              className="intel-btn intel-btn--new"
              onClick={() => setCreatingIntel(true)}
              type="button"
            >
              + New Report
            </button>
          </div>

          <div className="intel-search-wrapper">
            <input
              className="intel-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, summary, person, report, or operation…"
              aria-label="Search intel"
            />
          </div>
        </div>

        {/* Grid */}
        {!loading && !error && filteredIntel.length > 0 && (
          <div className="intel-grid">
            {filteredIntel.map((doc) => (
              <div className="intel-card" key={doc.id}>
                <div className="intel-card-header">
                  {doc.title || "Untitled"}
                </div>

                <div className="intel-card-summary">{doc.summary || "—"}</div>

                {/* Meta row: just pills + date */}
                <div className="intel-card-meta">
                  <span className="intel-pill">
                    {doc.operation_code || "—"}
                  </span>
                  <span className="intel-pill">{doc.status || "—"}</span>
                  <span className="intel-card-date">
                    {fmtDate(doc.last_updated) || "—"}
                  </span>
                </div>

                {/* Linked entities (outside the pill row) */}
                {doc.linked_persons?.length || doc.linked_reports?.length ? (
                  <div className="intel-card-actions">
                    {doc.linked_persons?.length ? (
                      <p className="intel-linked">
                        Linked persons:&nbsp;
                        {doc.linked_persons.map((p, i) => (
                          <button
                            key={`${p}-${i}`}
                            className="intel-link"
                            type="button"
                            onClick={() => {
                              setSelectedIntel(null);
                              navigate(
                                `/search?query=${encodeURIComponent(p)}`
                              );
                            }}
                          >
                            {p}
                          </button>
                        ))}
                      </p>
                    ) : null}

                    {doc.linked_reports?.length ? (
                      <p className="intel-linked">
                        Linked reports:&nbsp;
                        {doc.linked_reports.map((r, i) => (
                          <button
                            key={`${r}-${i}`}
                            className="intel-link"
                            type="button"
                            onClick={() => {
                              setSelectedIntel(null);
                              setSearchQuery(r);
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <button
                  className="intel-view-btn"
                  onClick={() => setSelectedIntel(doc)}
                  type="button"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading &&
          !error &&
          searchQuery.trim() &&
          filteredIntel.length === 0 && (
            <div className="intel-no-results">
              No results for <strong>{searchQuery.trim()}</strong>.
            </div>
          )}

        {!loading &&
          !error &&
          !searchQuery.trim() &&
          intelData.length === 0 && (
            <div className="intel-no-results">
              No intel reports yet.
              <div style={{ marginTop: "1rem" }}>
                <button
                  className="intel-btn intel-btn--new"
                  type="button"
                  onClick={() => setCreatingIntel(true)}
                >
                  + Create the first report
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Modals */}
      {creatingIntel && (
        <NewReportModalShim
          title={title}
          summary={summary}
          linkedPersons={linkedPersons}
          operationCode={operationCode}
          status={status}
          linkedReports={linkedReports}
          sourceVal={sourceVal}
          collectionMethod={collectionMethod}
          classification={classification}
          linkedOrganizations={linkedOrganizations}
          linkedOperations={linkedOperations}
          createdBy={createdBy}
          blackmailMaterial={blackmailMaterial}
          onTitleChange={setTitle}
          onSummaryChange={setSummary}
          onLinkedPersonsChange={setLinkedPersons}
          onOperationCodeChange={setOperationCode}
          onStatusChange={setStatus}
          onLinkedReportsChange={setLinkedReports}
          onSourceChange={setSourceVal}
          onCollectionMethodChange={setCollectionMethod}
          onClassificationChange={setClassification}
          onLinkedOrganizationsChange={setLinkedOrganizations}
          onLinkedOperationsChange={setLinkedOperations}
          onCreatedByChange={setCreatedBy}
          onBlackmailMaterialChange={setBlackmailMaterial}
          onCancel={() => setCreatingIntel(false)}
          onSave={handleNewIntelSave}
          submitting={submitting}
        />
      )}

      {selectedIntel && (
        <IntelDetailsModal
          intel={selectedIntel}
          onClose={() => setSelectedIntel(null)}
          onDelete={() => setConfirmDeleteId(selectedIntel.id)}
          onEdit={openEditFromDetails}
          onNavigateReport={(code) => {
            setSelectedIntel(null);
            setSearchQuery(code);
          }}
          onNavigatePerson={(name) => {
            setSelectedIntel(null);
            navigate(`/search?query=${encodeURIComponent(name)}`);
          }}
          fmtDate={fmtDate}
        />
      )}

      {editingIntel && (
        <EditReportModalShim
          title={eTitle}
          summary={eSummary}
          linkedPersons={eLinkedPersons}
          operationCode={eOperationCode}
          status={eStatus}
          linkedReports={eLinkedReports}
          sourceVal={eSourceVal}
          collectionMethod={eCollectionMethod}
          classification={eClassification}
          linkedOrganizations={eLinkedOrganizations}
          linkedOperations={eLinkedOperations}
          createdBy={eCreatedBy}
          blackmailMaterial={eBlackmailMaterial}
          onTitleChange={setETitle}
          onSummaryChange={setESummary}
          onLinkedPersonsChange={setELinkedPersons}
          onOperationCodeChange={setEOperationCode}
          onStatusChange={setEStatus}
          onLinkedReportsChange={setELinkedReports}
          onSourceChange={setESourceVal}
          onCollectionMethodChange={setECollectionMethod}
          onClassificationChange={setEClassification}
          onLinkedOrganizationsChange={setELinkedOrganizations}
          onLinkedOperationsChange={setELinkedOperations}
          onCreatedByChange={setECreatedBy}
          onBlackmailMaterialChange={setEBlackmailMaterial}
          onCancel={() => setEditingIntel(null)}
          onSave={saveEdit}
          saving={editSaving} // <-- bugfix (was "submitting")
        />
      )}

      {confirmDeleteId !== null && (
        <div className="intel-confirm-overlay">
          <div className="intel-confirm-modal">
            <h3>Delete Report</h3>
            <p>Are you sure you want to delete this intel report?</p>
            <div className="intel-confirm-actions">
              <button
                onClick={() => handleDeleteIntel(confirmDeleteId)}
                type="button"
                className="intel-btn intel-btn--danger"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                type="button"
                className="intel-btn"
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
