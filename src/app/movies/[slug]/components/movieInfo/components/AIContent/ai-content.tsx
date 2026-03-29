import { AiDescription } from '../../../../../../services/AiGeneratedMainContent';
import { Stack } from "react-bootstrap";

interface AiContentProps {
  content: AiDescription | null;
}

export default function AiContent({ content }: AiContentProps) {
  if (!content) {
    return <p className="text-muted-custom">No AI description available.</p>;
  }

  return (
    <Stack gap={4}>
      <section>
        <h2 className="heading-secondary">Synopsis</h2>
        <p className="text-content-muted">{content.synopsis}</p>
      </section>

      <section>
        <h2 className="heading-secondary">Fun Facts</h2>
        <p className="text-content-muted">{content.funFacts}</p>
      </section>

      <section>
        <h2 className="heading-secondary">Production Context</h2>
        <p className="text-content-muted">{content.productionContext}</p>
      </section>

      <section>
        <h2 className="heading-secondary">Reception</h2>
        <p className="text-content-muted">{content.reception}</p>
      </section>
    </Stack>
  );
}