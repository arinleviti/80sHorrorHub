"use client";

import Card from "react-bootstrap/Card";
import Spinner from "react-bootstrap/Spinner";

interface LoadingBlockProps {
  height?: number;
}

export default function LoadingBlock({ height = 200 }: LoadingBlockProps) {
  return (
    <Card className="contributioncard">
      <Card.Body
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: height }}
      >
        <Spinner animation="border" role="status" />
      </Card.Body>
    </Card>
  );
}