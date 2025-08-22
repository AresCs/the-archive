import type { Person } from '../../types';

function getAge(dob?: string): string {
  if (!dob) return '—';
  const birthDate = new Date(dob);
  const age = new Date().getFullYear() - birthDate.getFullYear();
  return `${age} yrs`;
}

export default function PersonCard({
  person,
  onEdit,
}: {
  person: Person;
  onEdit: () => void;
}) {
  const img = person.cctv_snapshots?.[0];

  return (
    <div className="bg-black border border-cyan-800 rounded-xl p-4 shadow-md text-left">
      {img && (
        <img
          src={img}
          alt="snapshot"
          className="mb-2 rounded w-full h-48 object-cover border border-cyan-900"
        />
      )}
      <h2 className="text-xl font-bold text-cyan-300">{person.full_name}</h2>
      <p className="text-sm">Age: {getAge(person.dob)}</p>
      <p className="text-sm text-cyan-400 italic">{person.gang_affiliation || 'Unaffiliated'}</p>
      <button
        onClick={onEdit}
        className="mt-3 text-yellow-400 hover:underline text-sm"
      >
        Edit
      </button>
    </div>
  );
}
