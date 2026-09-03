"use client";

import Image from "next/image";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import type { EbayItemSummary } from "@/app/services/ebay/getEbayItems";
import { DISPLAY_CATEGORY_ORDER, DisplayCategory } from "@/app/services/ebay/ebayCategories";
import styles from "./ebay-response.module.css";

interface EbayItemsListProps {
  ebayItems: EbayItemSummary[];
}

function groupByCategory(items: EbayItemSummary[]): Map<DisplayCategory, EbayItemSummary[]> {
  const map = new Map<DisplayCategory, EbayItemSummary[]>();
  for (const item of items) {
    const cat = item.category ?? "Other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(item);
  }
  return map;
}

const EbayItemsList: React.FC<EbayItemsListProps> = ({ ebayItems }) => {
  if (!ebayItems || ebayItems.length === 0) {
    return <p className="text-muted-custom">No eBay items available.</p>;
  }

  const grouped = groupByCategory(ebayItems);
  const visibleCategories = DISPLAY_CATEGORY_ORDER.filter(
    (cat) => (grouped.get(cat)?.length ?? 0) > 0
  );

  if (visibleCategories.length === 0) {
    return <p className="text-muted-custom">No eBay items available.</p>;
  }

  return (
    <Card className="contributioncard">
      <Card.Header className="heading-secondary">Collector&apos;s pick from eBay</Card.Header>
      <Card.Body>
        {visibleCategories.map((cat) => (
          <div key={cat} className={styles.categoryRow}>
            <h3 className={styles.categoryTitle}>{cat}</h3>
            <Row xs={2} sm={3} md={4} lg={5} className="g-3">
              {grouped.get(cat)!.map((item) => (
                <Col key={item.itemAffiliateWebUrl}>
                <a
                    href={item.itemAffiliateWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.itemCard}
                  >
                    {item.image?.imageUrl && (
                      <div className={styles.imageWrapper}>
                        <Image
                          src={item.image.imageUrl}
                          alt={item.title}
                          fill
                          sizes="(max-width: 576px) 45vw, 180px"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    )}
                    <span className={styles.itemTitle}>{item.title}</span>
                    {item.price && (
                      <small className="text-muted-custom">
                        {item.price.value} {item.price.currency}
                      </small>
                    )}
                  </a>
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
};

export default EbayItemsList;