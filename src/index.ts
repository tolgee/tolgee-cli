#!/usr/bin/env node

import { Command } from 'commander';
import ansi from 'ansi-colors';

import { getApiKey, savePak, savePat } from './config/credentials.js';
import loadTolgeeRc from './config/tolgeerc.js';

import RestClient from './client/index.js';
import { HttpError } from './client/errors.js';
import {
  setDebug,
  isDebugEnabled,
  debug,
  info,
  error,
} from './utils/logger.js';

import {
  API_KEY_OPT,
  API_URL_OPT,
  CONFIG_OPT,
  PROJECT_ID_OPT,
} from './options.js';
import {
  API_KEY_PAK_PREFIX,
  API_KEY_PAT_PREFIX,
  VERSION,
} from './constants.js';

import { Login, Logout } from './commands/login.js';
import PushCommand from './commands/push.js';
import PullCommand from './commands/pull.js';
import ExtractCommand from './commands/extract.js';
import CompareCommand from './commands/sync/compare.js';
import SyncCommand from './commands/sync/sync.js';
import { getSingleOption } from './utils/getSingleOption.js';

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
    const projectId = RestClient.projectIdFromKey(opts.apiKey);
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
    error(
      'No API key has been provided. You must either provide one via --api-key, or login via `tolgee login`.'
    );
    process.exit(1);
  }
}

async function preHandler(prog: Command, cmd: Command) {
  if (!NO_KEY_COMMANDS.includes(topLevelName(cmd))) {
    await loadApiKey(cmd);
    loadProjectId(cmd);
    validateOptions(cmd);

    const opts = cmd.optsWithGlobals();
    const client = new RestClient({
      apiUrl: opts.apiUrl,
      apiKey: opts.apiKey,
      projectId: opts.projectId,
    });

    cmd.setOptionValue('client', client);
  }

  // Apply verbosity
  setDebug(prog.opts().verbose);
}

const program = new Command('tolgee')
  .version(VERSION)
  .configureOutput({ writeErr: error })
  .description('Command Line Interface to interact with the Tolgee Platform')
  .option('-v, --verbose', 'Enable verbose logging.')
  .hook('preAction', preHandler);

// get config path to update defaults
const configPath = getSingleOption(CONFIG_OPT, process.argv);

// Global options
program.addOption(CONFIG_OPT);
program.addOption(API_URL_OPT);
program.addOption(API_KEY_OPT);
program.addOption(PROJECT_ID_OPT);

async function loadConfig() {
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

async function handleHttpError(e: HttpError) {
  error('An error occurred while requesting the API.');
  error(`${e.request.method} ${e.request.path}`);
  error(e.getErrorText());

  // Remove token from store if necessary
  if (e.response.statusCode === 401) {
    const removeFn = program.getOptionValue('_removeApiKeyFromStore');
    if (removeFn) {
      info('Removing the API key from the authentication store.');
      removeFn();
    }
  }

  // Print server output for server errors
  if (isDebugEnabled()) {
    // We cannot parse the response as JSON and pull error codes here as we may be here due to a 5xx error:
    // by nature 5xx class errors can happen for a lot of reasons (e.g. upstream issues, server issues,
    // catastrophic failure) which means the output is completely unpredictable. While some errors are
    // formatted by the Tolgee server, reality is there's a huge chance the 5xx error hasn't been raised
    // by Tolgee's error handler.
    const res = await e.response.body.text();
    debug(`Server response:\n\n---\n${res}\n---`);
  }
}

async function run() {
  try {
    const config = await loadConfig();

    // Register commands
    program.addCommand(Login);
    program.addCommand(Logout);
    program.addCommand(PushCommand(config));
    program.addCommand(PullCommand(config));
    program.addCommand(ExtractCommand(config));
    program.addCommand(CompareCommand(config));
    program.addCommand(SyncCommand(config));

    await program.parseAsync();
  } catch (e: any) {
    if (e instanceof HttpError) {
      await handleHttpError(e);
      process.exit(1);
    }

    // If the error is uncaught, huge chance that either:
    //  - The error should be handled here but isn't
    //  - The error should be handled in the command but isn't
    //  - Something went wrong with the code
    error('An unexpected error occurred while running the command.');
    error(
      'Please report this to our issue tracker: https://github.com/tolgee/tolgee-cli/issues'
    );
    console.log(e.stack);
    process.exit(1);
  }
}

run();
