"use client";

import { Button } from "react-bootstrap";

export default function CloseTabButton() {
  const handleCloseTab = () => {
    window.close();

    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  return (
    <Button variant="secondary" onClick={handleCloseTab}>
      Close this tab
    </Button>
  );
}