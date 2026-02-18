import { Command } from 'commander';
import { Schema } from '../schema.js';
import { BaseOptions } from '../options.js';
import { components } from '../client/internal/schema.generated.js';
import { handleLoadableError } from '../client/TolgeeClient.js';
import { fetchBranches, listBranches } from '../utils/branch.js';
import {
  error,
  exitWithError,
  info,
  loading,
  success,
} from '../utils/logger.js';

type MergeOptions = BaseOptions;
type MergeChange = components['schemas']['BranchMergeChangeModel'];

function resolveBranchName(
  opts: MergeOptions,
  branchArg?: string,
  branchExplicit?: boolean
) {
  if (branchArg && branchExplicit) {
    exitWithError(
      "error: use either the '[branch]' arg or the option '--branch <branch>'"
    );
  }
  const branchName = branchArg ?? (branchExplicit ? opts.branch : undefined);
  if (!branchName) {
    exitWithError('Specify a branch to merge.');
  }
  return branchName;
}

function renderChangeType(change: MergeChange) {
  switch (change.type) {
    case 'ADD':
      return '+';
    case 'UPDATE':
      return '~';
    case 'DELETE':
      return '-';
    case 'CONFLICT':
      return 'x';
  }
}

function renderChange(change: MergeChange) {
  const keyName =
    change.sourceKey?.keyName ?? change.targetKey?.keyName ?? 'unknown';
  const languages = change.changedTranslations?.length
    ? ` (${change.changedTranslations.join(', ')})`
    : '';
  return `${renderChangeType(change)} ${keyName}${languages}`;
}

function buildMergeUrl(opts: MergeOptions, mergeId: number) {
  return new URL(
    `/projects/${opts.projectId}/branches/merge/${mergeId}`,
    opts.apiUrl // API and frontend URLs may differ, but commonly they are the same
  ).toString();
}

const mergeHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: MergeOptions = this.optsWithGlobals();
    const branchArg = this.processedArgs[0];
    const branchExplicit =
      this.parent?.getOptionValueSource('branch') === 'cli';
    const branchName = resolveBranchName(opts, branchArg, branchExplicit);

    const branches = await loading(
      'Fetching project branches...',
      fetchBranches(opts)
    );

    const mergedBranch = branches.find((branch) => branch.name === branchName);
    if (!mergedBranch) {
      error(`Branch "${branchName}" was not found.`);
      listBranches(branches);
      exitWithError('Specify an existing branch to merge.');
    }

    if (mergedBranch.isDefault) {
      exitWithError('Cannot merge the default branch.');
    }

    const previewLoadable = await loading(
      `Preparing merge of "${branchName}"...`,
      opts.client.POST('/v2/projects/{projectId}/branches/merge/preview', {
        params: { path: { projectId: opts.client.getProjectId() } },
        body: { sourceBranchId: mergedBranch.id },
      })
    );
    handleLoadableError(previewLoadable);

    const mergeRef = previewLoadable.data!;

    const refreshLoadable = await loading(
      `Refreshing merge changes...`,
      opts.client.POST(
        '/v2/projects/{projectId}/branches/merge/{mergeId}/refresh',
        {
          params: {
            path: {
              projectId: opts.client.getProjectId(),
              mergeId: mergeRef.id,
            },
          },
        }
      )
    );
    handleLoadableError(refreshLoadable);

    const changesLoadable = await loading(
      `Checking merge changes...`,
      opts.client.GET(
        '/v2/projects/{projectId}/branches/merge/{mergeId}/changes',
        {
          params: {
            path: {
              projectId: opts.client.getProjectId(),
              mergeId: mergeRef.id,
            },
          },
        }
      )
    );
    handleLoadableError(changesLoadable);

    const changes = changesLoadable.data?._embedded?.branchMergeChanges ?? [];
    const totalChanges =
      changesLoadable.data?.page?.totalElements ?? changes.length;

    console.log('Changed keys:');
    changes.forEach((change) => {
      console.log(renderChange(change));
    });
    if (totalChanges > changes.length) {
      console.log(`...and ${totalChanges - changes.length} more`);
    }

    if (
      (refreshLoadable.data?.keyUnresolvedConflictsCount ??
        changes.filter(
          (change) => change.type === 'CONFLICT' && !change.resolution
        ).length) > 0
    ) {
      error(
        `Unresolved merge conflicts detected between "${branchName}" and "${mergeRef.targetBranchName}".`
      );
      info(`Finish merge in web app: ${buildMergeUrl(opts, mergeRef.id)}`);
      exitWithError('Resolve changes before merging.');
    }

    const applyLoadable = await loading(
      `Merging branch "${branchName}"...`,
      opts.client.POST(
        '/v2/projects/{projectId}/branches/merge/{mergeId}/apply',
        {
          params: {
            path: {
              projectId: opts.client.getProjectId(),
              mergeId: mergeRef.id,
            },
          },
        }
      )
    );
    handleLoadableError(applyLoadable);

    success(
      `Branch "${branchName}" merged into "${mergeRef.targetBranchName}".`
    );
  };

export default (config: Schema) =>
  new Command('merge')
    .description('Merge a branch into its origin branch')
    .argument('[branch]', 'Branch name to merge')
    .action(mergeHandler(config));
