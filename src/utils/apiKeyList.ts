import ansi from 'ansi-colors';

import {
  isOAuthSession,
  loadStore,
  OAuthSession,
  ProjectDetails,
  Token,
} from '../config/credentials.js';

function getProjectName(
  projectId: string,
  projectDetails?: Record<string, ProjectDetails>
) {
  return projectDetails?.[projectId]?.name;
}

function printToken(
  type: 'PAT' | 'PAK',
  token: Token,
  projectId?: string,
  projectDetails?: Record<string, ProjectDetails>
) {
  let result = type === 'PAK' ? ansi.green('PAK') : ansi.blue('PAT');

  if (projectId !== undefined) {
    const projectName = getProjectName(projectId, projectDetails);
    result += '\t ' + ansi.red(`#${projectId}` + ' ' + (projectName ?? ''));
  } else {
    result += '\t ' + ansi.yellow('<all projects>');
  }

  if (token.expires) {
    result +=
      '\t ' +
      ansi.grey('expires ' + new Date(token.expires).toLocaleDateString());
  } else {
    result += '\t ' + ansi.grey('never expires');
  }

  console.log(result);
}

function printOAuthSession(session: OAuthSession) {
  const who = session.userName ? ` as ${session.userName}` : '';
  console.log(
    ansi.magenta('OAuth') +
      '\t ' +
      ansi.yellow('<all projects>') +
      '\t ' +
      ansi.grey(`browser login${who}`)
  );
}

export async function printApiKeyLists() {
  const store = await loadStore();
  const list = Object.entries(store);

  if (list.length === 0) {
    console.log(ansi.gray('No records\n'));
  }

  for (const [origin, server] of list) {
    console.log(ansi.white('[') + ansi.red(origin) + ansi.white(']'));
    if (server.user) {
      if (isOAuthSession(server.user)) {
        printOAuthSession(server.user);
      } else {
        printToken('PAT', server.user);
      }
    }
    if (server.projects) {
      for (const [project, token] of Object.entries(server.projects)) {
        if (token) {
          printToken('PAK', token, project, server.projectDetails);
        }
      }
    }
    console.log('\n');
  }
  return;
}
