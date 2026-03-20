"use client";

import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";

type Props = {
  movieId: string;
};

export default function ContributionForm({ movieId }: Props) {
  const [section, setSection] = useState("SYNOPSIS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
            //Hey server, the body I’m sending is JSON
          "Content-Type": "application/json",
        },
        //Converts a JavaScript object into a JSON string to send to the server
        body: JSON.stringify({
          movieId,
          section,
          title,
          contributionBody: body,
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

      <Form.Group className="mb-3">
        <Form.Label>Title (optional)</Form.Label>
        <Form.Control
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional title"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Content</Form.Label>
        <Form.Control
          as="textarea"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
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