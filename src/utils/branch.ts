import { BaseOptions } from '../options.js';
import { components } from '../client/internal/schema.generated.js';
import { handleLoadableError } from '../client/TolgeeClient.js';
import { info, success } from './logger.js';

export function printBranchInfo(branch?: string) {
  if (branch) {
    info(`Using branch "${branch}"`);
  }
}

export async function fetchBranches(cmd: BaseOptions) {
  const loadable = await cmd.client.GET('/v2/projects/{projectId}/branches', {
    params: {
      path: { projectId: cmd.client.getProjectId() },
      query: { size: 10000, activeOnly: true },
    },
  });
  handleLoadableError(loadable);
  return loadable.data?._embedded?.branches ?? [];
}

export function listBranches(branches: components['schemas']['BranchModel'][]) {
  branches = branches.filter((b) => !b.merge || !b.merge.mergedAt);

  if (!branches.length) {
    success('No branches found.');
    return;
  }

  console.log('Branches:');
  branches.forEach((b) => {
    const markers: string[] = [];
    if (b.isDefault) markers.push('default');
    if (b.isProtected) markers.push('protected');
    if (b.active === false) markers.push('inactive');
    if (b.merge) markers.push('ongoing merge');
    const suffix = markers.length ? ` (${markers.join(', ')})` : '';
    console.log(`- ${b.name}${suffix}`);
  });
}
