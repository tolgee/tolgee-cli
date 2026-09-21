export type BrowserAvailability =
  | { canLaunch: true }
  | { canLaunch: false; fatal: boolean; reason: string };

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

/** `open` reports success in plenty of places where nothing appears. */
export function detectBrowserAvailability(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): BrowserAvailability {
  if (
    !isSet(env[ALLOW_IN_CI]) &&
    CI_VARIABLES.some((name) => isSet(env[name]))
  ) {
    return {
      canLaunch: false,
      fatal: true,
      reason: 'this looks like a CI run, where no browser can be opened',
    };
  }

  if (env.SSH_CONNECTION || env.SSH_TTY) {
    return {
      canLaunch: false,
      fatal: false,
      reason: 'this looks like an SSH session',
    };
  }

  if (platform !== 'darwin' && platform !== 'win32' && !hasDisplay(env)) {
    return {
      canLaunch: false,
      fatal: false,
      reason: 'no graphical display is available',
    };
  }

  return { canLaunch: true };
}

/** `CI=false` is a truthy string; ci-info reads it the same way. */
function isSet(value: string | undefined) {
  return Boolean(value) && value !== 'false' && value !== '0';
}

function hasDisplay(env: NodeJS.ProcessEnv) {
  return Boolean(env.DISPLAY || env.WAYLAND_DISPLAY);
}
