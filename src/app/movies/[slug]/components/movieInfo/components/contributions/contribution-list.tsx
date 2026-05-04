"use client";
import { Prisma } from "@prisma/client";
import { ContributionSection } from "@prisma/client";
import { Card, Button } from "react-bootstrap";
import { useState } from "react";
import Image from "next/image";
import styles from "./contribution-list.module.css";

type ContributionWithUser = Prisma.ContributionGetPayload<{
  include: { user: true };
}>;

interface ContributionListProps {
  grouped: Record<ContributionSection, ContributionWithUser[]>;
}

const sectionTitles: Record<ContributionSection, string> = {
  HORROR_LEGACY: "Horror Legacy",
  COLLECTOR_MARKET: "Collector Market",
  MEMORABILIA: "Memorabilia",
  CULT_STATUS: "Cult Status",
  OTHER: "Other",
};

export default function ContributionList({ grouped }: ContributionListProps) {
  const [localData, setLocalData] = useState(grouped);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const handleUpvote = async (id: string, section: ContributionSection) => {
    if (votedIds.has(id)) return;

    setLocalData((prev) => {
      const updatedSection = prev[section].map((c) =>
        c.id === id ? { ...c, upvotes: c.upvotes + 1 } : c
      );
      return { ...prev, [section]: updatedSection };
    });

    setVotedIds((prev) => new Set(prev).add(id));

    const res = await fetch(`/api/contributions/${id}/upvote`, { method: "POST" });
    if (!res.ok) {
      setVotedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const hasContributions = Object.values(grouped).some((items) => items.length > 0);

  return (
    <div className={styles.contributionWrapper}>
      <div>
        {hasContributions && (
          <h2 className="heading-secondary">User Contributions</h2>
        )}

        {Object.entries(grouped).map(([section, items]) => {
          if (!items.length) return null;

          return (
            <div key={section}>
              <h3 className={styles.contributionSectionTitle}>
                {sectionTitles[section as ContributionSection]}
              </h3>

              <div className={styles.contributionSection}>
                {items.map((contribution) => (
                  <Card key={contribution.id} className={styles.contributionCard}>
                    <Card.Body className={styles.contributionCardBody}>
                      {contribution.title && (
                        <Card.Title className={styles.contributionCardTitle}>
                          {contribution.title}
                        </Card.Title>
                      )}

                      <Card.Text className={styles.contributionCardText}>
                        {contribution.body}
                      </Card.Text>

                      <div className="d-flex justify-content-between align-items-center">
                        <small className={styles.contributionUserInfo}>
                          {contribution.user?.image && (
                            <Image
                              src={contribution.user.image}
                              width={16}
                              height={16}
                              alt={contribution.user.name || "User avatar"}
                              style={{ borderRadius: "50%" }}
                            />
                          )}
                          By {contribution.user?.name}
                        </small>

                        <Button
                          size="sm"
                          variant={votedIds.has(contribution.id) ? "success" : "outline-primary"}
                          disabled={votedIds.has(contribution.id)}
                          className={styles.contributionUpvoteBtn}
                          onClick={() =>
                            handleUpvote(contribution.id, section as ContributionSection)
                          }
                        >
                          {votedIds.has(contribution.id)
                            ? "▲ Voted"
                            : `▲ ${contribution.upvotes}`}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}