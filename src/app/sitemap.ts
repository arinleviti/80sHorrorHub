import { slugToIdMap } from '@/app/services/movies';

export default function sitemap() {
  return Object.keys(slugToIdMap).map(slug => ({
    url: `https://retrohorrorhub.com/movies/${slug}`,
    lastModified: new Date(),
  }));
}