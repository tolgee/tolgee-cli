#!/usr/bin/env node

import { Command } from 'commander';
import ansi from 'ansi-colors';

import { getApiKey, savePak, savePat } from './config/credentials.js';
import loadTolgeeRc from './config/tolgeerc.js';

import { setDebug, info, error, exitWithError } from './utils/logger.js';

import {
  API_KEY_OPT,
  API_URL_OPT,
  CONFIG_OPT,
  EXTRACTOR,
  FILE_PATTERNS,
  FORMAT_OPT,
  PROJECT_ID_OPT,
} from './options.js';
import {
  API_KEY_PAK_PREFIX,
  API_KEY_PAT_PREFIX,
  DEFAULT_API_URL,
  VERSION,
} from './constants.js';

import { Login, Logout } from './commands/login.js';
import PushCommand from './commands/push.js';
import PullCommand from './commands/pull.js';
import ExtractCommand from './commands/extract.js';
import CompareCommand from './commands/sync/compare.js';
import SyncCommand from './commands/sync/sync.js';
import TagCommand from './commands/tag.js';

import { getSingleOption } from './utils/getSingleOption.js';
import { Schema } from './schema.js';
import { createTolgeeClient } from './client/TolgeeClient.js';
import { projectIdFromKey } from './client/ApiClient.js';

const NO_KEY_COMMANDS = ['login', 'logout', 'extract'];

ansi.enabled = process.stdout.isTTY;

function topLevelName(command: Command): string {
  return command.parent && command.parent.parent
    ? topLevelName(command.parent)
    : command.name();
}

async function loadApiKey(cmd: Command) {
  const opts = cmd.optsWithGlobals();

  // API Key is already loaded
  if (opts.apiKey) return;

  // Attempt to load --api-key from config store if not specified
  // This is not done as part of the init routine or via the mandatory flag, as this is dependent on the API URL.
  const key = await getApiKey(opts.apiUrl, opts.projectId);

  // No key in store, stop here.
  if (!key) return;

  cmd.setOptionValue('apiKey', key);
  program.setOptionValue('_removeApiKeyFromStore', () => {
    if (key.startsWith(API_KEY_PAT_PREFIX)) {
      savePat(opts.apiUrl);
    } else {
      savePak(opts.apiUrl, opts.projectId);
    }
  });
}

function loadProjectId(cmd: Command) {
  const opts = cmd.optsWithGlobals();

  if (opts.apiKey?.startsWith(API_KEY_PAK_PREFIX)) {
    // Parse the key and ensure we can access the specified Project ID
    const projectId = projectIdFromKey(opts.apiKey);
    program.setOptionValue('projectId', projectId);

    if (opts.projectId !== -1 && opts.projectId !== projectId) {
      error(
        'The specified API key cannot be used to perform operations on the specified project.'
      );
      info(
        `The API key you specified is tied to project #${projectId}, you tried to perform operations on project #${opts.projectId}.`
      );
      info(
        'Learn more about how API keys in Tolgee work here: https://tolgee.io/platform/account_settings/api_keys_and_pat_tokens'
      );
      process.exit(1);
    }
  }
}

function validateOptions(cmd: Command) {
  const opts = cmd.optsWithGlobals();
  if (opts.projectId === -1) {
    error(
      'No Project ID have been specified. You must either provide one via --project-id, or by setting up a `.tolgeerc` file.'
    );
    info(
      'Learn more about configuring the CLI here: https://tolgee.io/tolgee-cli/project-configuration'
    );
    process.exit(1);
  }

  if (!opts.apiKey) {
    exitWithError(
      'No API key has been provided. You must either provide one via --api-key, or login via `tolgee login`.'
    );
  }
}

const preHandler = (config: Schema) =>
  async function (prog: Command, cmd: Command) {
    if (!NO_KEY_COMMANDS.includes(topLevelName(cmd))) {
      await loadApiKey(cmd);
      loadProjectId(cmd);
      validateOptions(cmd);

      const opts = cmd.optsWithGlobals();
      const client = createTolgeeClient({
        baseUrl: opts.apiUrl?.toString() ?? config.apiUrl?.toString(),
        apiKey: opts.apiKey,
        projectId:
          opts.projectId !== undefined
            ? Number(opts.projectId)
            : config.projectId !== undefined
            ? Number(config.projectId)
            : undefined,
      });

      cmd.setOptionValue('client', client);
    }

    // Apply verbosity
    setDebug(prog.opts().verbose);
  };

const program = new Command('tolgee')
  .version(VERSION)
  .configureOutput({ writeErr: error })
  .description('Command Line Interface to interact with the Tolgee Platform')
  .option('-v, --verbose', 'Enable verbose logging.');

// get config path to update defaults
const configPath = getSingleOption(CONFIG_OPT, process.argv);

async function loadConfig(program: Command) {
  const tgConfig = await loadTolgeeRc(configPath);

  if (tgConfig) {
    [program, ...program.commands].forEach((cmd) =>
      cmd.options.forEach((opt) => {
        const key = opt.attributeName();
        const value = (tgConfig as any)[key];
        if (value) {
          const parsedValue = opt.parseArg
            ? opt.parseArg(value, undefined)
            : value;
          cmd.setOptionValueWithSource(key, parsedValue, 'config');
        }
      })
    );
  }

  return tgConfig ?? {};
}

async function run() {
  try {
    // Global options
    program.addOption(CONFIG_OPT);
    program.addOption(API_URL_OPT.default(DEFAULT_API_URL));
    program.addOption(API_KEY_OPT);
    program.addOption(PROJECT_ID_OPT.default(-1));
    program.addOption(FORMAT_OPT.default('JSON_TOLGEE'));
    program.addOption(EXTRACTOR);
    program.addOption(FILE_PATTERNS);

    const config = await loadConfig(program);
    program.hook('preAction', preHandler(config));

    // Register commands
    program.addCommand(Login);
    program.addCommand(Logout);
    program.addCommand(
      PushCommand(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(
      PullCommand(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(
      ExtractCommand(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(
      CompareCommand(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(
      SyncCommand(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(
      TagCommand(config).configureHelp({ showGlobalOptions: true })
    );

    await program.parseAsync();
  } catch (e: any) {
    // If the error is uncaught, huge chance that either:
    //  - The error should be handled here but isn't
    //  - The error should be handled in the command but isn't
    //  - Something went wrong with the code
    error('An unexpected error occurred while running the command.');
    exitWithError(
      'Please report this to our issue tracker: https://github.com/tolgee/tolgee-cli/issues'
    );
  }
}

run();
