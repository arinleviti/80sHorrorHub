import { slugToIdMap } from '@/app/services/movies';

export default function sitemap() {
  const moviePages = Object.keys(slugToIdMap).map(slug => ({
    url: `https://retrohorrorhub.com/movies/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: 'https://retrohorrorhub.com',
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...moviePages,
  ];
}