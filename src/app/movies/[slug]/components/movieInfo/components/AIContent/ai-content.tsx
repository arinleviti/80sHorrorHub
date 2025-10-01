
import { AiDescription } from '../../../../../../services/AiGeneratedMainContent';
import styles from './ai-content.module.css';

interface AiContentProps {
  content: AiDescription | null;
}

export default async function AiContent({ content }: AiContentProps) {
 

  if (!content) return <p>No AI description available.</p>;

  return (
    <div className={styles.aiContent}>
      <h2>Synopsis</h2>
      <p>{content.synopsis}</p>

      <h2>Fun Facts</h2>
      <p>{content.funFacts}</p>

      <h2>Production Context</h2>
      <p>{content.productionContext}</p>

      <h2>Reception</h2>
      <p>{content.reception}</p>
    </div>
  );
}