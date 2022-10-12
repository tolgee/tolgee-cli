import type { components } from './internal/schema.generated';
import { request } from './internal/client';

type Project = components['schemas']['ProjectStatsModel'];

export async function projectIdOfPak(api: string | URL, pak: string) {
  const res = await request(new URL('/v2/projects/stats', api), 'GET', {
    'x-api-key': pak,
  });
  const stats = <Project>await res.json();

  return stats.projectId;
}
