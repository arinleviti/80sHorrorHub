import Image from "next/image";
import { EbaySearchResponse } from "@/app/services/ebay";

interface EbayItemsListProps {
  ebayItems: EbaySearchResponse;
}

const EbayItemsList: React.FC<EbayItemsListProps> = ({ ebayItems }) => {
  if (!ebayItems.itemSummaries || ebayItems.itemSummaries.length === 0) {
    return <p>No eBay items available</p>;
  }

  return (
    <div>
      <h2>eBay Items</h2>
      <ul>
        {ebayItems.itemSummaries.map(item => (
          <li key={item.itemAffiliateWebUrl}>
            <a href={item.itemAffiliateWebUrl} target="_blank" rel="noopener noreferrer">
              {item.title} - {item.price.value} {item.price.currency}
            </a>
            <Image
              src={item.image.imageUrl}
              alt={item.title}
              width={80}
              height={100}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EbayItemsList;