#!/usr/bin/env node

import { Command } from 'commander';

import Client from './client';
import { HttpError } from './client/errors';
import { setDebug, error } from './utils/logger';
import { VERSION } from './utils/constants';

import PushCommand from './commands/push';
import PullCommand from './commands/pull';
import ExtractCommand from './commands/extract';

function preHandler(prog: Command, cmd: Command) {
  const opts = cmd.opts();
  // Validate --project-id and --api-key if necessary
  if ('apiKey' in opts) {
    if (opts.project === -1 && !opts.apiKey.startsWith('tgpak_')) {
      error('Project ID is required when not using a Project API Key.');
      process.exit(1);
    }

    const client = new Client({
      apiUrl: opts.apiUrl,
      apiKey: opts.apiKey,
      projectId: opts.projectId,
    });

    cmd.setOptionValue('client', client);
  }

  // Apply verbosity
  setDebug(prog.opts().verbose);
}

const program = new Command('tolgee-cli')
  .version(VERSION)
  .description('Command Line Interface to interact with the Tolgee Platform')
  .option('-v, --verbose', 'Enable verbose logging.')
  .hook('preAction', preHandler);

// Register commands
program.addCommand(PushCommand);
program.addCommand(PullCommand);
program.addCommand(ExtractCommand);

// Run & handle potential uncaught failure
async function run() {
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

      if (e.response.status >= 500) {
        error(
          'The Tolgee server reported an unexpected server error. Please try again later.'
        );
        process.exit(1);
      }
    }

    error(`Uncaught Error: ${e.message}`);
    console.log(e);
    process.exit(1);
  }
}

run();
