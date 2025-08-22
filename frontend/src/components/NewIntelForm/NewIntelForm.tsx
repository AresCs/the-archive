import { useState } from "react";
import "./NewIntelForm.css";

type IntelDoc = {
  id: number;
  title: string;
  summary: string;
  linked_persons: string[];
  blackmail_material?: string;
  linked_reports?: string[];
};

type Props = {
  onClose: () => void;
  onSubmit: (data: IntelDoc) => void;
};

export default function NewIntelForm({ onClose, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [linkedPersons, setLinkedPersons] = useState("");
  const [blackmail, setBlackmail] = useState("");
  const [linkedReports, setLinkedReports] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }

    const payload = {
      title,
      summary,
      linked_persons: linkedPersons
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      blackmail_material: blackmail.trim() || undefined,
      linked_reports: linkedReports
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) || undefined,
    };

    try {
      setSubmitting(true);

      const res = await fetch("http://localhost:8000/api/intel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to save: ${res.statusText}`);
      }

      const savedIntel: IntelDoc = await res.json();
      onSubmit(savedIntel);

      // Reset fields
      setTitle("");
      setSummary("");
      setLinkedPersons("");
      setBlackmail("");
      setLinkedReports("");

      onClose();
    } catch (err) {
      alert("Error saving intel: " + err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="entry-form-container">
      <div className="entry-form-modal">
        <h2 style={{ color: "#00ffff" }}>New Intel Report</h2>

        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          placeholder="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />

        <input
          placeholder="Linked Persons (comma separated)"
          value={linkedPersons}
          onChange={(e) => setLinkedPersons(e.target.value)}
        />

        <input
          placeholder="Blackmail Material (optional)"
          value={blackmail}
          onChange={(e) => setBlackmail(e.target.value)}
        />

        <input
          placeholder="Linked Reports (comma separated, optional)"
          value={linkedReports}
          onChange={(e) => setLinkedReports(e.target.value)}
        />

        <div className="form-actions">
          <button onClick={onClose} disabled={submitting}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
