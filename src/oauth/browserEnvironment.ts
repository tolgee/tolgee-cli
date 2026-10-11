export const ALLOW_IN_CI = 'TOLGEE_BROWSER_LOGIN_IN_CI';

export const CI_VARIABLES = [
  'CI',
  'CONTINUOUS_INTEGRATION',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'BUILDKITE',
  'CIRCLECI',
  'TEAMCITY_VERSION',
  'JENKINS_URL',
  'TF_BUILD',
];

/**
 * Why no browser login can finish here, or undefined when one can be tried.
 * Only a CI run is refused: whether `open` reaches a browser cannot be told from
 * the environment, so everywhere else the URL is printed and the launch tried.
 */
export function reasonBrowserLoginCannotWork(
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (isSet(env[ALLOW_IN_CI])) {
    return undefined;
  }
  if (CI_VARIABLES.some((name) => isSet(env[name]))) {
    return 'this looks like a CI run, where no browser can be opened';
  }
  return undefined;
}

/** `CI=false` is a truthy string; ci-info reads it the same way. */
function isSet(value: string | undefined) {
  return Boolean(value) && value !== 'false' && value !== '0';
}
