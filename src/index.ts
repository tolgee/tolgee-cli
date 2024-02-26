#!/usr/bin/env node

import { Command } from 'commander';
import ansi from 'ansi-colors';

import { HttpError } from './client/errors.js';
import { isDebugEnabled, debug, info, error } from './utils/logger.js';
import { createProgram } from './program.js';

ansi.enabled = process.stdout.isTTY;

async function handleHttpError(program: Command, e: HttpError) {
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
  const program = createProgram();
  try {
    await program.parseAsync();
  } catch (e: any) {
    if (e instanceof HttpError) {
      await handleHttpError(program, e);
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
