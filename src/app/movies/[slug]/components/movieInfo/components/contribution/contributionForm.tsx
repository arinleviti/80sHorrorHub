"use client";

import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";

type Props = {
  movieId: string;
};

export default function ContributionForm({ movieId }: Props) {
  const [section, setSection] = useState("SYNOPSIS");
  const [type, setType] = useState("FAN_FACT");
  const [source, setSource] = useState("UNKNOWN");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const MIN_LENGTH = 150;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (body.length < MIN_LENGTH) {
      setStatus("error");
      setMessage(`Contribution must be at least ${MIN_LENGTH} characters.`);
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieId,
          section,
          type,
          source,
          title,
          body, // ✅ match your Prisma field name
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit contribution");
      }

      setStatus("success");
      setMessage("Contribution submitted for review!");

      setTitle("");
      setBody("");
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong.");
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Text className="text-muted">
  Share something specific: a detail, a story, or something most fans wouldn’t know.
</Form.Text>
      {/* SECTION */}
      <Form.Group className="mb-3">
        <Form.Label>Section</Form.Label>
        <Form.Select value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="SYNOPSIS">Synopsis</option>
          <option value="FUN_FACTS">Fun Facts</option>
          <option value="PRODUCTION_CONTEXT">Production Context</option>
          <option value="RECEPTION">Reception</option>
          <option value="OTHER">Other</option>
        </Form.Select>
      </Form.Group>

      {/* TYPE */}
      <Form.Group className="mb-3">
        <Form.Label>Type of Contribution</Form.Label>
        <Form.Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="FAN_FACT">Fan Fact</option>
          <option value="BEHIND_THE_SCENES">Behind the Scenes</option>
          <option value="PRODUCTION_DETAIL">Production Detail</option>
          <option value="PERSONAL_STORY">Personal Story</option>
        </Form.Select>
      </Form.Group>

      {/* SOURCE */}
      <Form.Group className="mb-3">
        <Form.Label>Source</Form.Label>
        <Form.Select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="INTERVIEW">Interview</option>
          <option value="ARTICLE">Article</option>
          <option value="PERSONAL">Personal Knowledge</option>
          <option value="UNKNOWN">Unknown</option>
        </Form.Select>
      </Form.Group>

      {/* TITLE */}
      <Form.Group className="mb-3">
        <Form.Label>Title (optional)</Form.Label>
        <Form.Control
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional title"
        />
      </Form.Group>

      {/* CONTENT */}
      <Form.Group className="mb-3">
        <Form.Label>Contribution</Form.Label>
        <Form.Control
          as="textarea"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="text-muted mt-1" style={{ fontSize: "0.9rem" }}>
          {body.length} / {MIN_LENGTH} characters minimum
        </div>
      </Form.Group>

      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Submitting..." : "Submit Contribution"}
      </Button>

      {message && (
        <Alert variant={status === "error" ? "danger" : "success"} className="mt-3">
          {message}
        </Alert>
      )}
    </Form>
  );
}