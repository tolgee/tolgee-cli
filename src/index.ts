#!/usr/bin/env node

import { Command } from 'commander';
import { loadTolgeeRc, getApiKey } from './config';

import RestClient from './client';
import { HttpError } from './client/errors';
import { setDebug, debug, info, error } from './utils/logger';
import {
  API_KEY_PAK_PREFIX,
  API_KEY_PAT_PREFIX,
  VERSION,
} from './utils/constants';

import { API_KEY_OPT, API_URL_OPT, PROJECT_ID_OPT } from './options';
import { Login, Logout } from './commands/login';
import PushCommand from './commands/push';
import PullCommand from './commands/pull';
import ExtractCommand from './commands/extract';

const NO_KEY_COMMANDS = ['login', 'logout', 'extract'];

async function validateApiKey(cmd: Command) {
  const opts = cmd.optsWithGlobals();

  if (!opts.apiKey) {
    // Attempt to load --api-key from config store if not specified
    // This is not done as part of the init routine or via the mandatory flag, as this is dependent on the API URL.
    const key = await getApiKey(opts.apiUrl, opts.projectId);

    if (!key) {
      error(
        'No API key has been provided. You must either provide one via --api-key, or login via `tolgee login`.'
      );
      process.exit(1);
    }

    cmd.setOptionValue('apiKey', key);
  }
}

function validateProjectId(cmd: Command) {
  const opts = cmd.optsWithGlobals();

  // Validate --project-id is present when using Project API keys
  if (opts.projectId === -1 && opts.apiKey.startsWith(API_KEY_PAT_PREFIX)) {
    error('You must specify a Project ID.');
    process.exit(1);
  }

  if (opts.projectId !== -1 && opts.apiKey.startsWith(API_KEY_PAK_PREFIX)) {
    // Parse the key to ensure we can access the specified Project ID
    const projectId = RestClient.projectIdFromKey(opts.apiKey);
    if (opts.projectId !== projectId) {
      error(
        'The specified API key cannot be used to perform operations on the specified project.'
      );
      info(
        `The API key you specified is tied to project #${projectId}, you tried to perform operations on project #${opts.projectId}.`
      );
      info(
        'Learn more about how API keys in Tolgee work here: https://tolgee.io/docs/platform/api-keys-and-pat-tokens'
      );
      process.exit(1);
    }
  }
}

function topLevelName (command: Command): string {
  return command.parent && command.parent.parent
    ? topLevelName(command.parent)
    : command.name()
}

async function preHandler(prog: Command, cmd: Command) {
  if (!NO_KEY_COMMANDS.includes(topLevelName(cmd))) {
    await validateApiKey(cmd);
    await validateProjectId(cmd);

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

// Global options
program.addOption(API_URL_OPT);
program.addOption(API_KEY_OPT);
program.addOption(PROJECT_ID_OPT);

// Register commands
program.addCommand(Login);
program.addCommand(Logout);
program.addCommand(PushCommand);
program.addCommand(PullCommand);
program.addCommand(ExtractCommand);

async function run() {
  try {
    // Load configuration
    const tgConfig = await loadTolgeeRc();
    if (tgConfig) {
      for (const [key, value] of Object.entries(tgConfig)) {
        program.setOptionValue(key, value);
      }
    }

    // Run & handle potential uncaught failure
    await program.parseAsync();
  } catch (e: any) {
    if (e instanceof HttpError) {
      error(
        `An error occurred while requesting ${e.request.method} ${e.request.url}.`
      );

      // Service Unavailable
      if (e.response.status === 503) {
        error('API is temporarily unavailable. Please try again later.');
        process.exit(1);
      }

      // Unauthorized
      if (e.response.status === 401) {
        error(
          "Couldn't authenticate with the API. Make sure your key is valid, hasn't expired, or hasn't been revoked."
        );
        process.exit(1);
      }

      // Forbidden
      if (e.response.status === 403) {
        error('You are not allowed to perform this operation.');
        process.exit(1);
      }

      // Server error
      if (e.response.status >= 500) {
        error(
          `The Tolgee server reported an unexpected server error (HTTP ${e.response.status} ${e.response.statusText}). Please try again later.`
        );

        // We cannot parse the response as JSON and pull error codes here: by nature 5xx class errors can happen for
        // a lot of reasons (e.g. upstream issues, server issues, catastrophic failure) which means the output is
        // completely unpredictable. While some errors are formatted by the Tolgee server, reality is there's a huge
        // chance the 5xx error hasn't been raised by Tolgee's error handler.
        const res = await e.response.text();
        const formatted = ' > ' + res.split('\n').join('\n > '); // Prefix with " > "
        debug(`Server response:\n${formatted}`);

        process.exit(1);
      }
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

// Augment Command type
declare module 'commander' {
  interface Command {
    options: Option[];
  }
}
