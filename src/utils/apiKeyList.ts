import ansi from 'ansi-colors';

import { loadStore, ProjectDetails, Token } from '#cli/config/credentials.js';

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

export async function printApiKeyLists() {
  const store = await loadStore();
  for (const [origin, server] of Object.entries(store)) {
    console.log(ansi.white('[') + ansi.red(origin) + ansi.white(']'));
    if (server.user) {
      printToken('PAT', server.user);
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
