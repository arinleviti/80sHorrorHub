import { CollectorDescription } from '../../../../../../services/collectorContentService';
import { Stack } from "react-bootstrap";
import style from "./AICollectorsContent.module.css";

interface CollectorContentProps {
  content: CollectorDescription | null;
}

export default function AICollectorContent({ content }: CollectorContentProps) {
  if (!content) {
    return <p className="text-muted-custom">No collector description available.</p>;
  }

  return (
    <Stack gap={2} className={style.aiContent}>
      <section>
        <h2 className="heading-secondary">Hook</h2>
        <p className="text-content-muted">{content.hook}</p>
      </section>

      <section>
        <h2 className="heading-secondary">Identity</h2>
        <p className="text-content-muted">{content.identity}</p>
      </section>

      <section>
        <h2 className="heading-secondary">Collector Focus</h2>
        <p className="text-content-muted">{content.collectorFocus}</p>
      </section>

      <section>
        <h2 className="heading-secondary">Context</h2>
        <p className="text-content-muted">{content.context}</p>
      </section>
    </Stack>
  );
}