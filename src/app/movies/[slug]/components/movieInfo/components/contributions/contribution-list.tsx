"use client";

import { Contribution, ContributionSection } from "@prisma/client";
import { Card, Button } from "react-bootstrap";
import { useState } from "react";
import Image from "next/image";

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
    const [localData, setLocalData] = useState(grouped);
    const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

    const handleUpvote = async (id: string, section: ContributionSection) => {
        // prevent double click in UI
        if (votedIds.has(id)) return;

        // optimistic update
        setLocalData((prev) => {
            const updatedSection = prev[section].map((c) =>
                c.id === id ? { ...c, upvotes: c.upvotes + 1 } : c
            );

            return {
                ...prev,
                [section]: updatedSection,
            };
        });

        // mark as voted
        setVotedIds((prev) => new Set(prev).add(id));

        // real request
        const res = await fetch(`/api/contributions/${id}/upvote`, {
            method: "POST",
        });

        if (!res.ok) {
            // rollback if needed
            setVotedIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };
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
                                            By {contribution.user?.name}
                                            {contribution.user?.image && (
                                                <Image
                                                    src={contribution.user.image}
                                                    width={20}
                                                    height={20}
                                                    alt={contribution.user.name || "User avatar"}
                                                />
                                            )}
                                        </small>

                                        {/* 👇 Upvote button placeholder */}
                                        <div>
                                            <Button
                                                size="sm"
                                                variant={votedIds.has(contribution.id) ? "success" : "outline-primary"}
                                                disabled={votedIds.has(contribution.id)}
                                                onClick={() =>
                                                    handleUpvote(
                                                        contribution.id,
                                                        section as ContributionSection
                                                    )
                                                }
                                            >
                                                {votedIds.has(contribution.id) ? "▲ Voted" : `▲ ${contribution.upvotes}`}
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