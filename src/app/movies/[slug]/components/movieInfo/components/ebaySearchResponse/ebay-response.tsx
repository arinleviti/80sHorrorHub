"use client";

import Image from "next/image";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Stack from "react-bootstrap/Stack";
import type { EbayItemSummary } from "@/app/services/ebay/getEbayItems";

interface EbayItemsListProps {
  ebayItems: EbayItemSummary[];
}

const EbayItemsList: React.FC<EbayItemsListProps> = ({ ebayItems }) => {
  // Guard clause for empty/null states
  if (!ebayItems || ebayItems.length === 0) {
    return <p className="text-muted-custom">No eBay items available.</p>;
  }

  return (
    <Card className="contributioncard">
      <Card.Header className="heading-secondary">Collector&apos;s pick from eBay</Card.Header>
      
      <ListGroup variant="flush">
        {ebayItems.map((item) => (
          <ListGroup.Item 
            key={item.itemAffiliateWebUrl} 
            className="d-flex align-items-center "
          >
            {/* Image Thumbnail */}
            {item.image?.imageUrl && (
              <div 
                style={{ 
                  position: "relative", 
                  width: 60, 
                  height: 80, 
                  marginRight: "1rem", 
                  flexShrink: 0 
                }}
              >
                <Image
                  src={item.image.imageUrl}
                  alt={item.title}
                  fill
                  sizes="60px"
                  style={{ objectFit: "cover", borderRadius: "4px" }}
                />
              </div>
            )}

            {/* Item Details */}
            <Stack gap={1}>
              <a
                href={item.itemAffiliateWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent fw-bold"
              >
                {item.title}
              </a>
              
              {item.price && (
                <small className="text-muted-custom">
                  {item.price.value} {item.price.currency}
                </small>
              )}
            </Stack>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
};

export default EbayItemsList;