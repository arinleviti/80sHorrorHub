import Image from "next/image";
import { TMDBImageConfig } from "@/app/services/tmdb";

export interface CastMember {
  actorName: string;
  character: string;
  profile_path?: string | null;
}

interface CastListProps {
  cast: CastMember[];
  config: TMDBImageConfig;
}

export default function CastList({ cast, config }: CastListProps) {
  if (!cast || cast.length === 0) {
    return <p>No cast information available</p>;
  }

  return (
    <div>
      <h2>Cast</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {cast.map((member, index) => (
          <li key={`${member.actorName}-${index}`} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            {member.profile_path ? (
              <Image
                src={`${config.secure_base_url}w185${member.profile_path}`}
                alt={member.actorName}
                width={50}
                height={70}
                style={{ objectFit: "cover", borderRadius: "4px" }}
              />
            ) : (
              <div style={{ width: 50, height: 70, backgroundColor: "#ccc", borderRadius: "4px" }} />
            )}
            <span>
              <strong>{member.character}</strong>: {member.actorName}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}