"use client";

import { useState } from "react";
import { Form, Alert } from "react-bootstrap";
import styles from "./contributionForm.module.css";

type Props = {
  movieId: string;
};

export default function ContributionForm({ movieId }: Props) {
  const [section, setSection] = useState("HORROR_LEGACY");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setStatus("loading");
    try {
      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, section, title, body }),
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
    <div className={styles.formWrapper}>
      <button
        className={styles.mobileToggle}
        onClick={() => setFormOpen((prev) => !prev)}
      >
        <h3 className="heading-secondary mb-0">Add your contribution</h3>
        <span className={styles.mobileToggleIcon}>{formOpen ? "▲" : "▼"}</span>
      </button>

      <Form
        onSubmit={handleSubmit}
        className={`contribution-form ${styles.formBody} ${formOpen ? styles.formBodyOpen : ""}`}
      >
        <h3 className={`heading-secondary mb-3 ${styles.desktopTitle}`}>Add your contribution</h3>
        <Form.Text className="text-muted">
          <p>Share a collector&apos;s insight: a tip, a find, or something only fans would know.</p>
        </Form.Text>

        <Form.Group className="mb-1">
          <Form.Label className={styles.label}>Section</Form.Label>
          <Form.Select
            className={styles.inputField}
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            <option value="HORROR_LEGACY">Horror Legacy</option>
            <option value="COLLECTOR_MARKET">Collector Market</option>
            <option value="MEMORABILIA">Memorabilia</option>
            <option value="CULT_STATUS">Cult Status</option>
            <option value="OTHER">Other</option>
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-1">
          <Form.Label className={styles.label}>Title (optional)</Form.Label>
          <Form.Control
            className={styles.inputField}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
          />
        </Form.Group>

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
          
        </Form.Group>

        <button
          type="submit"
          disabled={status === "loading"}
          className={styles.submitBtn}
        >
          {status === "loading" ? "Submitting..." : "Submit Contribution"}
        </button>

        {message && (
          <Alert variant={status === "error" ? "danger" : "success"} className="mt-3 py-2 small">
            {message}
          </Alert>
        )}
      </Form>
    </div>
  );
}