import { useState } from "react";
import type { Person } from "../../types";

export default function PersonForm({
  person,
  onClose,
}: {
  person: Partial<Person>;
  onClose: () => void;
}) {
  const [form, setForm] = useState(person);

  const handleChange = <K extends keyof Person>(field: K, value: Person[K]) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    const endpoint = form.id ? "update" : "create";
    const res = await fetch(`http://localhost:8000/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) onClose();
  };

  return (
    <div className="bg-black border border-cyan-800 p-4 rounded mb-4">
      <h2 className="text-2xl mb-2">{form.id ? "Edit Person" : "New Entry"}</h2>
      <input
        placeholder="Full Name"
        value={form.full_name || ""}
        onChange={(e) => handleChange("full_name", e.target.value)}
        className="w-full mb-2 p-2 bg-gray-900 text-cyan-300"
      />
      <input
        placeholder="Alias"
        value={form.known_aliases?.[0] || ""}
        onChange={(e) => handleChange("known_aliases", [e.target.value])}
        className="w-full mb-2 p-2 bg-gray-900 text-cyan-300"
      />
      <input
        placeholder="Gang"
        value={form.gang_affiliation || ""}
        onChange={(e) => handleChange("gang_affiliation", e.target.value)}
        className="w-full mb-2 p-2 bg-gray-900 text-cyan-300"
      />
      <input
        placeholder="Last Seen"
        value={form.last_known_location || ""}
        onChange={(e) => handleChange("last_known_location", e.target.value)}
        className="w-full mb-2 p-2 bg-gray-900 text-cyan-300"
      />
      <div className="flex gap-2 mt-4">
        <button onClick={handleSave} className="bg-green-600 px-4 py-1 rounded">
          Save
        </button>
        <button onClick={onClose} className="bg-red-600 px-4 py-1 rounded">
          Cancel
        </button>
      </div>
    </div>
  );
}
