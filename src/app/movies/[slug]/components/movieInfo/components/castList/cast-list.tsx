"use client";

import { useState } from "react";
import Image from "next/image";
import { TMDBImageConfig } from "@/app/services/tmdb";
import { ListGroup, Button, Stack } from "react-bootstrap";

export interface CastMember {
  actorName: string;
  character: string;
  profile_path?: string | null;
  imagekitProfilePath?: string | null;  // add this
}

interface CastListProps {
  cast: CastMember[];
  config: TMDBImageConfig;
}

export default function CastList({ cast, config }: CastListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!cast || cast.length === 0) {
    return <p className="text-muted-custom">No cast information available</p>;
  }

  const visibleCast = expanded ? cast : cast.slice(0, 5);

  return (
    <Stack gap={3}>
      <h2 className="heading-secondary">Cast</h2>

      <ListGroup variant="flush">
        {visibleCast.map((member, index) => (
          <ListGroup.Item
            key={`${member.actorName}-${index}`}
            className="d-flex align-items-center gap-2 py-2"
          >
            {member.profile_path ? (
              <Image
                src={member.imagekitProfilePath ?? `${config.secure_base_url}w185${member.profile_path}`}
                alt={member.actorName}
                width={50}
                height={70}
                style={{ objectFit: "cover", borderRadius: "4px" }}
              />
            ) : (
              <div className="placeholder-img" />
            )}

            <span>
              <strong className="text-accent">{member.character}</strong>:{" "}
              <span className="text-accent">{member.actorName}</span>
            </span>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {cast.length > 10 && (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          className="align-self-start"
        >
          {expanded ? "Show less" : `Show all (${cast.length})`}
        </Button>
      )}
    </Stack>
  );
}