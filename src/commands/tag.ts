import { Command, Option } from 'commander';
import { Schema } from '../schema.js';
import { BaseOptions } from '../options.js';
import { handleLoadableError } from '../client/TolgeeClient.js';
import { exitWithError, loading, success } from '../utils/logger.js';
import { extractKeysOfFiles } from '../extractor/runner.js';
import { components } from '../client/internal/schema.generated.js';

type KeyId = components['schemas']['KeyId'];

type TagOptions = BaseOptions & {
  filterExtracted?: boolean;
  filterTag?: string[];
  filterNoTag?: string[];
  tagFiltered?: string[];
  tagOther?: string[];
  untagFiltered?: string[];
  untagOther?: string[];
};

const tagHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: TagOptions = this.optsWithGlobals();

    let extractedKeys: KeyId[] | undefined;
    if (opts.filterExtracted) {
      const patterns = opts.patterns;
      if (!patterns?.length) {
        exitWithError('Missing option --patterns or config.patterns option');
      }

      const extracted = await loading(
        'Analyzing code...',
        extractKeysOfFiles(patterns, opts.extractor)
      );

      const keys = [...extracted.values()].flatMap((item) => item.keys);
      extractedKeys = keys.map((key) => ({
        name: key.keyName,
        namespace: key.namespace,
      }));
    }

    const loadable = await loading(
      'Tagging...',
      opts.client.PUT('/v2/projects/{projectId}/tag-complex', {
        params: { path: { projectId: opts.client.getProjectId() } },
        body: {
          filterTag: opts.filterTag,
          filterTagNot: opts.filterNoTag,
          tagFiltered: opts.tagFiltered,
          tagOther: opts.tagOther,
          untagFiltered: opts.untagFiltered,
          untagOther: opts.untagOther,
          filterKeys: extractedKeys,
        },
      })
    );

    handleLoadableError(loadable);
    success('Done!');
  };

export default (config: Schema) =>
  new Command('tag')
    .description('Update tags in your project.')
    .addOption(
      new Option(
        '--filter-extracted',
        'Extract keys from code and filter by it.'
      )
    )
    .addOption(
      new Option('--filter-tag <tags...>', 'Filter only keys with tag.')
    )
    .addOption(
      new Option('--filter-no-tag <tags...>', 'Filter only keys without tag.')
    )
    .addOption(
      new Option('--tag-filtered <tags...>', 'Add tag to filtered keys.')
    )
    .addOption(
      new Option('--tag-other <tags...>', 'Tag keys which are not filtered.')
    )
    .addOption(
      new Option('--untag-filtered <tags...>', 'Remove tag from filtered keys.')
    )
    .addOption(
      new Option(
        '--untag-other <tags...>',
        'Remove tag from keys which are not filtered.'
      )
    )
    .action(tagHandler(config));
