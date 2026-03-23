"use client";

import { Contribution, ContributionSection } from "@prisma/client";
import { Card, Button } from "react-bootstrap";

interface ContributionListProps {
  grouped: Record<ContributionSection, Contribution[]>;
}

const sectionTitles: Record<ContributionSection, string> = {
  SYNOPSIS: "Synopsis",
  FUN_FACTS: "Fun Facts",
  PRODUCTION_CONTEXT: "Production Context",
  RECEPTION: "Reception",
  OTHER: "Other",
};

export default function ContributionList({ grouped }: ContributionListProps) {
  return (
    <div>
      <h2 className="mb-4">User Contributions</h2>

      {Object.entries(grouped).map(([section, items]) => {
        if (!items.length) return null;

        return (
          <div key={section} className="mb-5">
            <h3 className="mb-3">
              {sectionTitles[section as ContributionSection]}
            </h3>

            {items.map((contribution) => (
              <Card key={contribution.id} className="mb-3">
                <Card.Body>
                  {contribution.title && (
                    <Card.Title>{contribution.title}</Card.Title>
                  )}

                  <Card.Text>{contribution.body}</Card.Text>

                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      By {contribution.userId}
                    </small>

                    {/* 👇 Upvote button placeholder */}
                    <div>
                      <Button size="sm" variant="outline-primary">
                        ▲ {contribution.upvotes}
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        );
      })}
    </div>
  );
}