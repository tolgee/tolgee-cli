import { Command, Option } from 'commander';
import { Schema } from '../schema.js';
import { BaseOptions } from '../options.js';
import { components } from '../client/internal/schema.generated.js';
import { handleLoadableError } from '../client/TolgeeClient.js';
import { fetchBranches, listBranches } from '../utils/branch.js';
import { error, exitWithError, loading, success } from '../utils/logger.js';

type BranchOptions = BaseOptions & {
  create?: string;
  delete?: string;
  origin?: string;
};

function resolveTargetNames(opts: BranchOptions, createArg?: string) {
  const createName = opts.create ?? createArg;
  const deleteName = opts.delete;

  if (opts.create && createArg) {
    exitWithError(
      "error: use either the '[branch]' arg to create branch or the option '-c, --create <branch>'"
    );
  }
  if (createArg && deleteName) {
    exitWithError(
      "error: '[branch]' arg to create branch cannot be used together with option '-d, --delete <branch>'"
    );
  }
  // opts.create && opts.delete use is already sanitized by commander

  return { createName, deleteName };
}

async function resolveOriginId(
  opts: BranchOptions,
  branches: components['schemas']['BranchModel'][]
): Promise<number> {
  const originName = opts.origin;

  if (originName) {
    const origin = branches.find((b) => b.name === originName);
    if (!origin) {
      error(`Origin branch "${originName}" was not found.`);
      listBranches(branches);
      exitWithError(
        'Use --origin <branch> to specify an existing base branch.'
      );
    }
    return origin.id;
  }

  const defaultBranch = branches.find((b) => b.isDefault);
  if (!defaultBranch) {
    error('Cannot determine default branch for the project.');
    listBranches(branches);
    exitWithError('Specify --origin <branch>.');
  }
  return defaultBranch.id;
}

const branchHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: BranchOptions = this.optsWithGlobals();
    const createArg = this.processedArgs[0];
    const { createName, deleteName } = resolveTargetNames(opts, createArg);

    const branches = await loading(
      'Fetching project branches...',
      fetchBranches(opts)
    );

    if (!createName && !deleteName) {
      listBranches(branches);
      return;
    }

    if (createName) {
      const originId = await resolveOriginId(opts, branches);

      const loadable = await loading(
        `Creating branch "${createName}"...`,
        opts.client.POST('/v2/projects/{projectId}/branches', {
          params: { path: { projectId: opts.client.getProjectId() } },
          body: { name: createName, originBranchId: originId },
        })
      );
      handleLoadableError(loadable);
      success(`Branch "${createName}" created.`);
      return;
    }

    if (deleteName) {
      const target = branches.find((b) => b.name === deleteName);
      if (!target) {
        error(`Branch "${deleteName}" was not found.`);
        listBranches(branches);
        exitWithError('Specify an existing branch.');
      }

      const loadable = await loading(
        `Deleting branch "${deleteName}"...`,
        opts.client.DELETE('/v2/projects/{projectId}/branches/{branchId}', {
          params: {
            path: {
              projectId: opts.client.getProjectId(),
              branchId: target.id,
            },
          },
        })
      );
      handleLoadableError(loadable);
      success(`Branch "${deleteName}" deleted.`);
    }
  };

export default (config: Schema) =>
  new Command('branch')
    .description('Create or delete project branches')
    .argument('[branch]', 'branch name to create')
    .addOption(
      new Option('--create <branch>', 'create a new branch').conflicts('delete')
    )
    .addOption(
      new Option(
        '-d, --delete <branch>',
        'delete an existing branch'
      ).conflicts('create')
    )
    .addOption(
      new Option(
        '-o, --origin <branch>',
        'origin branch to fork from (defaults to project default branch)'
      )
    )
    .action(branchHandler(config));
