import AdminContributions from "./admin-contributions/adminContributions";
import { Container } from "react-bootstrap";
export default function AdminPage() {
  return (
    <Container className="mt-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      <AdminContributions />
    </Container>
  );
}