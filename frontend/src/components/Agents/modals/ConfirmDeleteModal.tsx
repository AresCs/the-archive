import { useEffect } from "react";

export default function ConfirmDeleteModal({
  open,
  name,
  onCancel,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  name?: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="agents-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agents-confirm-delete-title"
    >
      <div className="agents-modal">
        <h2 id="agents-confirm-delete-title" className="agents-title" style={{ marginBottom: "0.75rem" }}>
          Confirm Delete
        </h2>
        <p style={{ marginBottom: "0.75rem", color: "#9ff" }}>
          Are you sure you want to delete {name ? <strong>{name}</strong> : "this agent"}? This action cannot be undone.
        </p>
        <div className="agent-form-actions">
          <button type="button" className="delete-button" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : "Yes, Delete"}
          </button>
          <button type="button" className="back-button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
