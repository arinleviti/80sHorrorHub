"use client";

import { useState } from "react";
import { Form, Button, Alert } from "react-bootstrap";
import styles from "./contributionForm.module.css";

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, section, type, source, title, body }),
      });
      if (!res.ok) throw new Error("Failed to submit");
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
    <Form onSubmit={handleSubmit} className="contribution-form">
      <Form.Text className="text-muted">
        <h3 className="heading-secondary mb-3">
          Add your contribution
        </h3>
        <p>Share something specific: a detail, a story, or something most fans wouldn’t know.</p>
      </Form.Text>

      {/* SECTION - Space reduced to mb-1 */}
      <Form.Group className="mb-1">
        <Form.Label className={styles.label}>Section</Form.Label>
        <Form.Select 
          className={styles.inputField} 
          value={section} 
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="SYNOPSIS">Synopsis</option>
          <option value="FUN_FACTS">Fun Facts</option>
          <option value="PRODUCTION_CONTEXT">Production Context</option>
          <option value="RECEPTION">Reception</option>
          <option value="OTHER">Other</option>
        </Form.Select>
      </Form.Group>

      {/* TYPE - Space reduced to mb-1 */}
      <Form.Group className="mb-1">
        <Form.Label className={styles.label}>Type of Contribution</Form.Label>
        <Form.Select 
          className={styles.inputField} 
          value={type} 
          onChange={(e) => setType(e.target.value)}
        >
          <option value="FAN_FACT">Fan Fact</option>
          <option value="BEHIND_THE_SCENES">Behind the Scenes</option>
          <option value="PRODUCTION_DETAIL">Production Detail</option>
          <option value="PERSONAL_STORY">Personal Story</option>
        </Form.Select>
      </Form.Group>

      {/* SOURCE - Space reduced to mb-1 */}
      <Form.Group className="mb-1">
        <Form.Label className={styles.label}>Source</Form.Label>
        <Form.Select 
          className={styles.inputField} 
          value={source} 
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="INTERVIEW">Interview</option>
          <option value="ARTICLE">Article</option>
          <option value="PERSONAL">Personal Knowledge</option>
          <option value="UNKNOWN">Unknown</option>
        </Form.Select>
      </Form.Group>

      {/* TITLE - Space reduced to mb-1 */}
      <Form.Group className="mb-1">
        <Form.Label className={styles.label}>Title (optional)</Form.Label>
        <Form.Control
          className={styles.inputField}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional title"
        />
      </Form.Group>

      {/* CONTENT - Kept mb-3 for slightly more room before the button */}
      <Form.Group className="mb-3">
        <Form.Label className={styles.label}>Contribution</Form.Label>
        <Form.Control
          className={styles.inputField}
          as="textarea"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="text-muted mt-1" style={{ fontSize: "0.8rem" }}>
          {body.length} / {MIN_LENGTH} characters
        </div>
      </Form.Group>

      <Button type="submit" disabled={status === "loading"} className="w-100">
        {status === "loading" ? "Submitting..." : "Submit Contribution"}
      </Button>

      {message && (
        <Alert variant={status === "error" ? "danger" : "success"} className="mt-3 py-2 small">
          {message}
        </Alert>
      )}
    </Form>
  );
}