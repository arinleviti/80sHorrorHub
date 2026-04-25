import EbayItemsList from "./ebay-response";
import { getCuratedEbayItems } from "@/app/services/ebay/getCuratedEbayItems";
import { Movie } from "@/app/services/tmdb";

interface EbaySectionProps {
  movie: Movie;
}

export default async function EbaySection({ movie }: EbaySectionProps) {
  const items = await getCuratedEbayItems(
    movie.id,
    movie.title,
    movie.release_date?.slice(0, 4) || ""
  );

  return <EbayItemsList ebayItems={items} />;
}