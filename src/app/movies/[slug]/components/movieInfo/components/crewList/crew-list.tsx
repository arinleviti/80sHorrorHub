export interface CrewMember {
  id?: number;      // TMDB ID or any unique identifier
  name: string;
  job: string;
}

interface CrewListProps {
  crew: CrewMember[];
}

const CrewList: React.FC<CrewListProps> = ({ crew }) => {
  if (!crew || crew.length === 0) {
    return null; // nothing to show if no crew
  }

  return (
    <div className="crew-list mt-6">
      <h2 className="text-xl font-bold mb-2">Crew</h2>
      <ul className="list-disc list-inside space-y-1">
        {crew.map((member, index) => (
    <li key={member.id ?? `${member.name}-${member.job}-${index}`}>
      <span className="font-semibold">{member.job}</span>: {member.name}
    </li>
  ))}
      </ul>
    </div>
  );
};

export default CrewList;