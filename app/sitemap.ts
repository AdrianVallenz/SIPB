import type { MetadataRoute } from 'next';

const SCHEMA_UPDATED_AT = new Date('2026-11-14T00:00:00.000Z');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://sipb.web.id',
      lastModified: SCHEMA_UPDATED_AT,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://sipb.web.id/login',
      lastModified: SCHEMA_UPDATED_AT,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}

