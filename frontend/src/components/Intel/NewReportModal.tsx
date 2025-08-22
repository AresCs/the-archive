import ReactDOM from "react-dom";

type Props = {
  title: string;
  summary: string;
  linkedPersons: string;
  operationCode: string;
  status: string;
  linkedReports: string;
  sourceVal: string;
  collectionMethod: string;
  classification: string;
  linkedOrganizations: string;
  linkedOperations: string;
  createdBy: string;
  onTitleChange: (v: string) => void;
  onSummaryChange: (v: string) => void;
  onLinkedPersonsChange: (v: string) => void;
  onOperationCodeChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onLinkedReportsChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  onCollectionMethodChange: (v: string) => void;
  onClassificationChange: (v: string) => void;
  onLinkedOrganizationsChange: (v: string) => void;
  onLinkedOperationsChange: (v: string) => void;
  onCreatedByChange: (v: string) => void;
  /** NOTE: renamed from onSubmit -> onSave to match IntelFilesPage.tsx */
  onSave: () => void;
  onCancel: () => void;
  submitting: boolean;
};

export default function NewReportModal({
  title,
  summary,
  linkedPersons,
  operationCode,
  status,
  linkedReports,
  sourceVal,
  collectionMethod,
  classification,
  linkedOrganizations,
  linkedOperations,
  createdBy,
  onTitleChange,
  onSummaryChange,
  onLinkedPersonsChange,
  onOperationCodeChange,
  onStatusChange,
  onLinkedReportsChange,
  onSourceChange,
  onCollectionMethodChange,
  onClassificationChange,
  onLinkedOrganizationsChange,
  onLinkedOperationsChange,
  onCreatedByChange,
  onSave,
  onCancel,
  submitting,
}: Props) {
  return ReactDOM.createPortal(
    <div
      className="entry-form-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-intel-title"
    >
      <div className="entry-form-modal">
        <h2 id="new-intel-title">New Intel Report</h2>

        <div className="detail-grid">
          {/* LEFT */}
          <section className="detail-section">
            <h3 className="detail-section-title">Summary</h3>
            <input
              aria-label="Title"
              placeholder="Title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
            <textarea
              aria-label="Summary"
              placeholder="Summary"
              value={summary}
              onChange={(e) => onSummaryChange(e.target.value)}
              rows={4}
            />

            <h3 className="detail-section-title">Evidence</h3>
            <input
              aria-label="Source"
              placeholder="Source"
              value={sourceVal}
              onChange={(e) => onSourceChange(e.target.value)}
            />
            <input
              aria-label="Collection Method"
              placeholder="Collection Method"
              value={collectionMethod}
              onChange={(e) => onCollectionMethodChange(e.target.value)}
            />
            <input
              aria-label="Classification"
              placeholder="Classification"
              value={classification}
              onChange={(e) => onClassificationChange(e.target.value)}
            />
            <input
              aria-label="Linked Org (comma separated)"
              placeholder="Linked Org (comma separated)"
              value={linkedOrganizations}
              onChange={(e) => onLinkedOrganizationsChange(e.target.value)}
            />
            <input
              aria-label="Linked Operation (comma separated)"
              placeholder="Linked Operation (comma separated)"
              value={linkedOperations}
              onChange={(e) => onLinkedOperationsChange(e.target.value)}
            />
          </section>

          {/* RIGHT */}
          <section className="detail-section">
            <h3 className="detail-section-title">Operational Details</h3>
            <input
              aria-label="Operation Code"
              placeholder="Operation Code"
              value={operationCode}
              onChange={(e) => onOperationCodeChange(e.target.value)}
            />
            <input
              aria-label="Status"
              placeholder="Status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
            />

            <h3 className="detail-section-title">Linked Entities</h3>
            <input
              aria-label="Persons (comma separated)"
              placeholder="Persons (comma separated)"
              value={linkedPersons}
              onChange={(e) => onLinkedPersonsChange(e.target.value)}
            />

            <h3 className="detail-section-title">Linked Reports</h3>
            <input
              aria-label="Reports (comma separated)"
              placeholder="Reports (comma separated)"
              value={linkedReports}
              onChange={(e) => onLinkedReportsChange(e.target.value)}
            />

            <h3 className="detail-section-title">Meta</h3>
            <input
              aria-label="Created by"
              placeholder="Created by"
              value={createdBy}
              onChange={(e) => onCreatedByChange(e.target.value)}
            />
          </section>
        </div>

        <div className="form-actions">
          <button onClick={onSave} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <button onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
