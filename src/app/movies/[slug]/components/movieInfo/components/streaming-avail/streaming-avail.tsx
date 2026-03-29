"use client";

import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Stack from "react-bootstrap/Stack";
import Button from "react-bootstrap/Button";
import type { GetStreamingAvailabilityReturn } from "@/app/services/streamingAvail";

interface StreamingAvailabilityProps {
  streamingAvailability: GetStreamingAvailabilityReturn;
}

const StreamingAvailabilityList: React.FC<StreamingAvailabilityProps> = ({ 
  streamingAvailability 
}) => {
  // Guard clause for errors or empty data
  if (
    !streamingAvailability || 
    'error' in streamingAvailability || 
    !streamingAvailability.streamingOptions ||
    streamingAvailability.streamingOptions.length === 0
  ) {
    return <p className="text-muted-custom">No streaming availability information available</p>;
  }

  return (
    <Card className="contributioncard">
      <Card.Header className="heading-secondary">Streaming Availability (US)</Card.Header>
      
      <ListGroup variant="flush">
        {streamingAvailability.streamingOptions.map((option, i) => (
          <ListGroup.Item key={`${option.serviceName}-${option.type}-${option.quality || "NA"}-${i}`}>
            <Stack direction="horizontal" gap={2} className="align-items-center">
              <span className="fw-bold text-content-muted">{option.serviceName}:</span>
              
              <span className="text-content-muted">
                {option.type} ({option.quality || 'HD'})
              </span>

              {option.link && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  href={option.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-auto" // Pushes the button to the far right
                >
                  Watch
                </Button>
              )}
            </Stack>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};

export default StreamingAvailabilityList;