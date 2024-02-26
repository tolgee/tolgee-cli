import { Command } from 'commander';

import { getApiKey, savePak, savePat } from './config/credentials.js';
import loadTolgeeRc from './config/tolgeerc.js';

import RestClient from './client/index.js';
import { setDebug, info, error } from './utils/logger.js';

import {
  API_KEY_OPT,
  API_URL_OPT,
  BaseOptions,
  ENV_OPT,
  PROJECT_ID_OPT,
  parseProjectId,
  parseUrlArgument,
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
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

function topLevelName(command: Command): string {
  return command.parent && command.parent.parent
    ? topLevelName(command.parent)
    : command.name();
}

async function loadApiKey(program: Command, cmd: Command) {
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

function loadProjectId(program: Command, cmd: Command) {
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
  const NO_KEY_COMMANDS = ['login', 'logout', 'extract'];

  if (!NO_KEY_COMMANDS.includes(topLevelName(cmd))) {
    await loadApiKey(prog, cmd);
    loadProjectId(prog, cmd);
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

export function loadEnvironmentalVariables(program: Command) {
  const options: BaseOptions = program.optsWithGlobals();
  const envFilePath = path.resolve(process.cwd(), options.env);

  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath });

    /** Sets the option value if it was not specified by the user. */
    const setOptionValue = (key: string, value: unknown) => {
      if (program.getOptionValueSourceWithGlobals(key) !== 'cli') {
        program.setOptionValue(key, value);
      }
    };

    if (process.env.TOLGEE_API_KEY) {
      setOptionValue('apiKey', process.env.TOLGEE_API_KEY);
    }
    if (process.env.TOLGEE_API_URL) {
      setOptionValue('apiUrl', parseUrlArgument(process.env.TOLGEE_API_URL));
    }
    if (process.env.TOLGEE_PROJECT_ID) {
      setOptionValue(
        'projectId',
        parseProjectId(process.env.TOLGEE_PROJECT_ID)
      );
    }
  }
}

export function createProgram() {
  const program = new Command('tolgee')
    .version(VERSION)
    .configureOutput({ writeErr: error })
    .description('Command Line Interface to interact with the Tolgee Platform')
    .option('-v, --verbose', 'Enable verbose logging.')
    .hook('preAction', loadEnvironmentalVariables)
    .hook('preAction', loadConfig)
    .hook('preAction', preHandler);

  // Global options
  program.addOption(ENV_OPT);
  program.addOption(API_URL_OPT);
  program.addOption(API_KEY_OPT);
  program.addOption(PROJECT_ID_OPT);

  // Register commands
  program.addCommand(Login);
  program.addCommand(Logout);
  program.addCommand(PushCommand);
  program.addCommand(PullCommand);
  program.addCommand(ExtractCommand);
  program.addCommand(CompareCommand);
  program.addCommand(SyncCommand);

  return program;
}

export async function loadConfig(program: Command) {
  const tgConfig = await loadTolgeeRc();
  if (tgConfig) {
    for (const [key, value] of Object.entries(tgConfig)) {
      if (program.getOptionValueSourceWithGlobals(key) !== 'cli') {
        program.setOptionValue(key, value);
      }
    }
  }
}
