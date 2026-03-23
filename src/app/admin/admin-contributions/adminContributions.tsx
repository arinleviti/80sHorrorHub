"use client";
import { Container, Card, Button } from "react-bootstrap";
import { useEffect, useState } from "react";

type Contribution = {
  id: string;
  title: string | null;
  body: string;
  section: "SYNOPSIS" | "FUN_FACTS" | "PRODUCTION_CONTEXT" | "RECEPTION" | "OTHER";
  user: {
    name: string | null;
  };
  movie: {
    title: string;
  } | null;
};

export default function AdminContributions() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchContributions() {
    try {
      const res = await fetch("/api/admin/contributions");
      const data = await res.json();

      console.log("API RESPONSE:", data);

      setContributions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async (
    id: string,
    status: "APPROVED" | "REJECTED"
  ) => {
    await fetch(`/api/admin/contributions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    // refresh list after action
    await fetchContributions();
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Pending Contributions</h2>

      {contributions.length === 0 && <p>No pending contributions.</p>}

      {contributions.map((c) => (
        <Card key={c.id} className="mb-3">
          <Card.Body>
            <Card.Title>{c.movie?.title ?? "Deleted Movie"}</Card.Title>

            <Card.Subtitle className="mb-2 text-muted">
              By: {c.user.name}
            </Card.Subtitle>

            <Card.Text>
              <strong>Section:</strong> {c.section}
            </Card.Text>

            {c.title && (
              <Card.Text>
                <strong>Title:</strong> {c.title}
              </Card.Text>
            )}

            <Card.Text>{c.body}</Card.Text>

            <div className="d-flex gap-2">
              <Button
                variant="success"
                onClick={() => handleAction(c.id, "APPROVED")}
              >
                Approve
              </Button>

              <Button
                variant="danger"
                onClick={() => handleAction(c.id, "REJECTED")}
              >
                Reject
              </Button>
            </div>
          </Card.Body>
        </Card>
      ))}
    </Container>
  );
}