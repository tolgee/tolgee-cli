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
  filterNotExtracted?: boolean;
  filterTag?: string[];
  filterNoTag?: string[];
  tag?: string[];
  tagOther?: string[];
  untag?: string[];
  untagOther?: string[];
};

const tagHandler = (config: Schema) =>
  async function (this: Command) {
    const opts: TagOptions = this.optsWithGlobals();

    let extractedKeys: KeyId[] | undefined;
    if (opts.filterExtracted || opts.filterNotExtracted) {
      if (opts.filterExtracted && opts.filterNotExtracted) {
        exitWithError(
          'Use either "--filter-extracted" or "--filter-not-extracted", not both'
        );
      }

      const extracted = await loading(
        'Analyzing code...',
        extractKeysOfFiles(opts)
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
          tagFiltered: opts.tag,
          tagOther: opts.tagOther,
          untagFiltered: opts.untag,
          untagOther: opts.untagOther,
          filterKeys: opts.filterExtracted ? extractedKeys : undefined,
          filterKeysNot: opts.filterNotExtracted ? extractedKeys : undefined,
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
      new Option(
        '--filter-not-extracted',
        'Extract keys from code and filter them out.'
      )
    )
    .addOption(
      new Option(
        '--filter-tag <tags...>',
        'Filter only keys with tag. Use * as a wildcard.'
      )
    )
    .addOption(
      new Option(
        '--filter-no-tag <tags...>',
        'Filter only keys without tag. Use * as a wildcard.'
      )
    )
    .addOption(new Option('--tag <tags...>', 'Add tag to filtered keys.'))
    .addOption(
      new Option('--tag-other <tags...>', 'Tag keys which are not filtered.')
    )
    .addOption(
      new Option(
        '--untag <tags...>',
        'Remove tag from filtered keys. Use * as a wildcard.'
      )
    )
    .addOption(
      new Option(
        '--untag-other <tags...>',
        'Remove tag from keys which are not filtered. Use * as a wildcard.'
      )
    )
    .action(tagHandler(config));
