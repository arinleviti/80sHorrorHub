"use client";

import { useState } from "react";
import { ListGroup, Button, Stack } from "react-bootstrap";

export interface CrewMember {
  id?: number;
  name: string;
  job: string;
}

interface CrewListProps {
  crew: CrewMember[];
}

export default function CrewList({ crew }: CrewListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!crew || crew.length === 0) {
    return null;
  }

  const visibleCrew = expanded ? crew : crew.slice(0, 10);

  return (
    <Stack gap={3}>
      <h2 className="heading-secondary">Crew</h2>

      <ListGroup variant="flush">
        {visibleCrew.map((member, index) => (
          <ListGroup.Item
            key={member.id ?? `${member.name}-${member.job}-${index}`}
            className="d-flex justify-content-between align-items-center py-2"
          >
            <span className="fw-semibold text-accent">{member.job}</span>
            <span>{member.name}</span>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {crew.length > 10 && (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => setExpanded((prev) => !prev)}
          className="align-self-start"
        >
          {expanded ? "Show less" : `Show all (${crew.length})`}
        </Button>
      )}
    </Stack>
  );
}