"use client";

import { useState } from "react";
import { ListGroup, Stack } from "react-bootstrap";
import style from "./crew-list.module.css";

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

  const visibleCrew = expanded ? crew : crew.slice(0, 5);

  return (
    <Stack gap={3}>
      <h2 className="heading-secondary">Crew</h2>

      <ListGroup variant="flush">
        {visibleCrew.map((member, index) => (
          <ListGroup.Item
            key={member.id ?? `${member.name}-${member.job}-${index}`}
            className="d-flex justify-content-between align-items-center"
          >
            <span className="fw-semibold text-accent">{member.job}</span>
            <span>{member.name}</span>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {crew.length > 5 && (
        <div className={style.toggleWrapper}>
          <button
            className={style.toggleBtn}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Show less" : `Show all (${crew.length})`}
          </button>
        </div>
      )}
    </Stack>
  );
}