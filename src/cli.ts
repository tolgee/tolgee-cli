#!/usr/bin/env node

import { Command } from 'commander';
import ansi from 'ansi-colors';

import { getStoredCredentials } from './config/credentials.js';
import { NO_PROJECT, resolveProjectId } from './config/projectId.js';
import loadTolgeeRc from './config/tolgeerc.js';

import { setDebug, info, error } from './utils/logger.js';

import {
  API_KEY_OPT,
  API_URL_OPT,
  CONFIG_OPT,
  DEFAULT_NAMESPACE,
  EXTRACTOR,
  EXTRA_HEADER,
  FILE_PATTERNS,
  FORMAT_OPT,
  STRICT_NAMESPACE,
  PARSER,
  PROJECT_ID_OPT,
  PROJECT_BRANCH,
  STRICT_NAMESPACE_NEGATION,
  VERBOSE,
  apiUrlOrDefault,
} from './options.js';
import { API_KEY_PAK_PREFIX, VERSION } from './constants.js';

import { Login, Logout } from './commands/login.js';
import PushCommand from './commands/push.js';
import PullCommand from './commands/pull.js';
import ExtractCommand from './commands/extract.js';
import CompareCommand from './commands/sync/compare.js';
import SyncCommand from './commands/sync/sync.js';
import TagCommand from './commands/tag.js';
import BranchCommand from './commands/branch.js';
import MergeCommand from './commands/merge.js';

import { getSingleOption } from './utils/getSingleOption.js';
import { mergeHeaders } from './utils/headers.js';
import { Schema } from './schema.js';
import { createTolgeeClient } from './client/TolgeeClient.js';
import { projectIdFromKey } from './client/ApiClient.js';
import { printApiKeyLists } from './utils/apiKeyList.js';
import { createOAuthSessionHandle } from './oauth/session.js';
import { reportError } from './utils/reportError.js';

const NO_KEY_COMMANDS = ['login', 'logout', 'extract'];

ansi.enabled = process.stdout.isTTY;

function topLevelName(command: Command): string {
  return command.parent && command.parent.parent
    ? topLevelName(command.parent)
    : command.name();
}

async function loadCredentials(cmd: Command, headers: Record<string, string>) {
  const opts = cmd.optsWithGlobals();

  // API Key is already loaded
  if (opts.apiKey) return;

  // Attempt to load credentials from the config store if not specified.
  // This is not done as part of the init routine or via the mandatory flag,
  // as this is dependent on the API URL.
  const credentials = await getStoredCredentials(opts.apiUrl, opts.projectId);

  if (!credentials) return;

  if (credentials.type === 'oauth') {
    cmd.setOptionValue(
      'oauthSession',
      createOAuthSessionHandle(opts.apiUrl, credentials.session, headers)
    );
    return;
  }

  cmd.setOptionValue('apiKey', credentials.key);
}

function loadProjectId(cmd: Command) {
  const opts = cmd.optsWithGlobals();

  const { projectId, refusal } = resolveProjectId({
    configured: opts.projectId,
    apiKeyProject: opts.apiKey?.startsWith(API_KEY_PAK_PREFIX)
      ? projectIdFromKey(opts.apiKey)
      : undefined,
    sessionProject: opts.oauthSession?.getProjectId(),
  });

  if (refusal) {
    error(refusal.error);
    refusal.details.forEach(info);
    process.exit(1);
  }

  program.setOptionValue('projectId', projectId);
}

async function validateOptions(cmd: Command) {
  const opts = cmd.optsWithGlobals();

  if (opts.projectId === -1) {
    error(
      'No Project ID have been specified. You must either provide one via --project-id, or by setting up a `.tolgeerc` file.'
    );
    info(
      'If you provide Project Api Key (PAK) via `--api-key`, Project ID is derived automatically. So is a browser ' +
        'login approved for a single project.'
    );
    info(
      'Learn more about configuring the CLI here: https://tolgee.io/tolgee-cli/project-configuration'
    );
    process.exit(1);
  }

  if (!opts.apiKey && !opts.oauthSession) {
    error(
      `Not authenticated for host ${ansi.blue(opts.apiUrl.hostname)} and project ${ansi.blue(opts.projectId)}.`
    );
    info(
      `You must either provide api key via --api-key or login via \`tolgee login\` (for correct api url and project)`
    );

    console.log('\nYou are logged into these projects:');
    await printApiKeyLists();

    process.exit(1);
  }
}

const preHandler = (config: Schema) =>
  async function (prog: Command, cmd: Command) {
    if (!NO_KEY_COMMANDS.includes(topLevelName(cmd))) {
      const headers = mergeHeaders(
        config.headers,
        cmd.optsWithGlobals().extraHeader
      );
      await loadCredentials(cmd, headers);
      loadProjectId(cmd);
      await validateOptions(cmd);

      const opts = cmd.optsWithGlobals();
      await opts.oauthSession?.ensureFresh();
      const client = createTolgeeClient({
        baseUrl: opts.apiUrl.toString(),
        apiKey: opts.apiKey,
        session: opts.oauthSession,
        projectId: opts.projectId,
        headers,
      });

      cmd.setOptionValue('client', client);
    }

    // Apply verbosity
    setDebug(Boolean(prog.opts().verbose));
  };

const program = new Command('tolgee')
  .version(VERSION)
  .configureOutput({ writeErr: error })
  .description('Command Line Interface to interact with the Tolgee Platform');
// get config path to update defaults
const configPath = getSingleOption(CONFIG_OPT, process.argv);

async function loadConfig() {
  const tgConfig = await loadTolgeeRc(configPath);

  return tgConfig ?? {};
}

async function run() {
  try {
    const config = await loadConfig();
    program.hook('preAction', preHandler(config));

    // Global options
    program.addOption(VERBOSE);
    program.addOption(CONFIG_OPT);
    program.addOption(API_URL_OPT.default(apiUrlOrDefault(config.apiUrl)));
    program.addOption(API_KEY_OPT.default(config.apiKey));
    program.addOption(PROJECT_ID_OPT.default(config.projectId ?? NO_PROJECT));
    program.addOption(PROJECT_BRANCH.default(config.branch));
    program.addOption(FORMAT_OPT.default(config.format ?? 'JSON_TOLGEE'));
    program.addOption(EXTRACTOR.default(config.extractor));
    program.addOption(FILE_PATTERNS.default(config.patterns));
    program.addOption(PARSER.default(config.parser));
    program.addOption(STRICT_NAMESPACE.default(config.strictNamespace ?? true));
    program.addOption(STRICT_NAMESPACE_NEGATION);
    program.addOption(DEFAULT_NAMESPACE.default(config.defaultNamespace));
    program.addOption(EXTRA_HEADER);

    // Register commands
    program.addCommand(
      Login(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(Logout(config));
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
    program.addCommand(
      BranchCommand(config).configureHelp({ showGlobalOptions: true })
    );
    program.addCommand(
      MergeCommand(config).configureHelp({ showGlobalOptions: true })
    );

    await program.parseAsync();
  } catch (e: any) {
    reportError(e);
  }
}

run();
