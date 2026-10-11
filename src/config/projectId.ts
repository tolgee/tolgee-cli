/** -1 is what the CLI uses for "no project named", from the option default. */
export const NO_PROJECT = -1;

export type ProjectRefusal = { error: string; details: string[] };

export type ProjectResolution =
  | { projectId: number; refusal?: undefined }
  | { projectId?: undefined; refusal: ProjectRefusal };

export function resolveProjectId(credential: {
  configured: number;
  apiKeyProject?: number;
  sessionProject?: number;
}): ProjectResolution {
  const { configured, apiKeyProject, sessionProject } = credential;

  if (apiKeyProject !== undefined) {
    if (configured !== NO_PROJECT && configured !== apiKeyProject) {
      return {
        refusal: {
          error:
            'The specified API key cannot be used to perform operations on the specified project.',
          details: [
            `The API key you specified is tied to project #${apiKeyProject}, you tried to perform operations on project #${configured}.`,
            'Learn more about how API keys in Tolgee work here: https://tolgee.io/platform/account_settings/api_keys_and_pat_tokens',
          ],
        },
      };
    }
    return { projectId: apiKeyProject };
  }

  if (sessionProject !== undefined) {
    if (configured !== NO_PROJECT && configured !== sessionProject) {
      return {
        refusal: {
          error:
            'Your browser login cannot be used to perform operations on the specified project.',
          details: [
            `You approved it for project #${sessionProject}, you tried to perform operations on project #${configured}.`,
            'Run `tolgee login` again to approve another project, or choose all projects on the consent screen.',
          ],
        },
      };
    }
    return { projectId: sessionProject };
  }

  return { projectId: configured };
}
