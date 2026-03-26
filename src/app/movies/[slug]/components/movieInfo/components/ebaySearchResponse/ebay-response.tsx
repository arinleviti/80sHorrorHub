// ebay-response.tsx
import Image from "next/image";
import { EbayItemSummary } from "@/app/services/ebay/getEbayItems";

interface EbayItemsListProps {
  ebayItems: EbayItemSummary[]; // directly an array
}

const EbayItemsList: React.FC<EbayItemsListProps> = ({ ebayItems }) => {
  if (!ebayItems || ebayItems.length === 0) {
    return <p>No eBay items available</p>;
  }

  return (
    <div>
      <h2>eBay Items</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {ebayItems.map((item) => (
          <li key={item.itemAffiliateWebUrl} style={{ marginBottom: "1rem" }}>
            <a
              href={item.itemAffiliateWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 500, display: "block" }}
            >
              {item.title} - {item.price.value} {item.price.currency}
            </a>
            {item.image.imageUrl && (
              <Image
                src={item.image.imageUrl}
                alt={item.title}
                width={80}
                height={100}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EbayItemsList;