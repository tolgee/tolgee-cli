#!/usr/bin/env node

import { Command } from 'commander';

import { loadTolgeeRc, loadAuthToken } from './config';

import Client from './client';
import { HttpError } from './client/errors';
import { setDebug, warn, error } from './utils/logger';
import { VERSION } from './utils/constants';

import { API_KEY_OPT } from './options';
import { Login, Logout } from './commands/login';
import PushCommand from './commands/push';
import PullCommand from './commands/pull';
import ExtractCommand from './commands/extract';

function hasApiKeyArg(cmd: Command): boolean {
  for (const opt of cmd.options) {
    if (opt === API_KEY_OPT) {
      return true;
    }
  }

  return cmd.parent ? hasApiKeyArg(cmd.parent) : false;
}

async function preHandler(prog: Command, cmd: Command) {
  const opts = cmd.optsWithGlobals();

  if (hasApiKeyArg(cmd)) {
    if (!opts.apiKey) {
      // Attempt to load --api-key from config store if not specified
      // This is not done as part of the init routine or via the mandatory flag, as this is dependent on the API URL.
      const key = await loadAuthToken(opts.apiUrl);

      if (!key) {
        error('You must specify an API key.');
        process.exit(1);
      }

      opts.apiKey = key;
      cmd.setOptionValue('apiKey', key);
    }

    // Validate --project-id is present when using Project API keys
    if (opts.projectId === -1 && !opts.apiKey.startsWith('tgpak_')) {
      error('You must specify a Project ID.');
      process.exit(1);
    }

    if (opts.projectId !== -1 && opts.apiKey.startsWith('tgpak_')) {
      warn(
        'A Project ID has been specified but you are using a Project API key. This might be unwanted.'
      );
    }

    const client = new Client({
      apiUrl: opts.apiUrl,
      apiKey: opts.apiKey,
      projectId: opts.projectId,
    });

    cmd.setOptionValue('client', client);
  }

  // Apply verbosity
  setDebug(opts.verbose);
}

const program = new Command('tolgee-cli')
  .version(VERSION)
  .configureOutput({ writeErr: error })
  .description('Command Line Interface to interact with the Tolgee Platform')
  .option('-v, --verbose', 'Enable verbose logging.')
  .hook('preAction', preHandler);

// Register commands
program.addCommand(Login);
program.addCommand(Logout);
program.addCommand(PushCommand);
program.addCommand(PullCommand);
program.addCommand(ExtractCommand);

async function run() {
  // Load configuration
  const tgConfig = await loadTolgeeRc();
  if (tgConfig) {
    for (const [key, value] of Object.entries(tgConfig)) {
      program.setOptionValue(key, value);
    }
  }

  // Run & handle potential uncaught failure
  try {
    await program.parseAsync();
  } catch (e: any) {
    if (e instanceof HttpError) {
      if (e.response.status === 503) {
        error(
          'The Tolgee server is temporarily unavailable. Please try again later.'
        );
        process.exit(1);
      }

      if (e.response.status === 403) {
        error('You are not allowed to perform this operation.');
        process.exit(1);
      }

      if (e.response.status >= 500) {
        error(
          'The Tolgee server reported an unexpected server error. Please try again later.'
        );
        process.exit(1);
      }
    }

    error(`Uncaught Error: ${e.message}`);
    // console.log(e);
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
