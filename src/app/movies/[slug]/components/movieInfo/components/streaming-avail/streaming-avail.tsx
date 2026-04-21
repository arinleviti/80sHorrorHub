"use client";

import { useState } from "react";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import type { GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";
import styles from "./streaming-avail.module.css";

interface StreamingAvailabilityProps {
  streamingAvailability: GetStreamingAvailabilityReturn;
}

const StreamingAvailabilityList: React.FC<StreamingAvailabilityProps> = ({
  streamingAvailability,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (
    !streamingAvailability ||
    "error" in streamingAvailability ||
    !streamingAvailability.streamingOptions ||
    streamingAvailability.streamingOptions.length === 0
  ) {
    return <p className="text-muted-custom">No streaming availability information available</p>;
  }

  const limit = 3;
  const options = streamingAvailability.streamingOptions;
  const visible = expanded ? options : options.slice(0, limit);

  return (
    <Card className="contributioncard">
      <Card.Header className="heading-secondary">Streaming Availability (US)</Card.Header>

      <ListGroup variant="flush">
        {visible.map((option, i) => (
          <ListGroup.Item key={`${option.serviceName}-${option.type}-${option.quality || "NA"}-${i}`}>
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <span className="fw-bold text-content-muted">{option.serviceName}:</span>
              <span className="text-content-muted">
                {option.type} ({option.quality || "HD"})
              </span>
              {option.link && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  href={option.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-auto"
                >
                  Watch
                </Button>
              )}
            </Stack>
          </ListGroup.Item>
        ))}
      </ListGroup>

      {options.length > limit && (
        <div className={styles.toggleWrapper}>
          <button
            className={styles.toggleBtn}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Show less" : `Show all (${options.length})`}
          </button>
        </div>
      )}
    </Card>
  );
};

export default StreamingAvailabilityList;