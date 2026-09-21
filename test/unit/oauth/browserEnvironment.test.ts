import {
  ALLOW_IN_CI,
  detectBrowserAvailability,
} from '#cli/oauth/browserEnvironment.js';

const DESKTOP = { DISPLAY: ':0' };

describe('browser availability', () => {
  it('launches on a desktop session', () => {
    expect(detectBrowserAvailability(DESKTOP, 'linux')).toEqual({
      canLaunch: true,
    });
    expect(detectBrowserAvailability({}, 'darwin')).toEqual({
      canLaunch: true,
    });
    expect(detectBrowserAvailability({}, 'win32')).toEqual({
      canLaunch: true,
    });
  });

  it('treats a CI run as fatal, since nobody is there to approve', () => {
    for (const name of ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'JENKINS_URL']) {
      expect(
        detectBrowserAvailability({ ...DESKTOP, [name]: 'true' }, 'linux')
      ).toMatchObject({ canLaunch: false, fatal: true });
    }
  });

  it.each(['false', '0', ''])('does not read CI=%s as a CI run', (value) => {
    expect(
      detectBrowserAvailability({ ...DESKTOP, CI: value }, 'linux')
    ).toEqual({ canLaunch: true });
  });

  it('lets the user overrule the CI guess', () => {
    expect(
      detectBrowserAvailability(
        { ...DESKTOP, CI: 'true', [ALLOW_IN_CI]: '1' },
        'linux'
      )
    ).toEqual({ canLaunch: true });
  });

  it('does not give up over an SSH session', () => {
    expect(
      detectBrowserAvailability({ ...DESKTOP, SSH_CONNECTION: '1 2 3 4' })
    ).toMatchObject({ canLaunch: false, fatal: false });
  });

  it('does not launch on a headless unix box', () => {
    expect(detectBrowserAvailability({}, 'linux')).toMatchObject({
      canLaunch: false,
      fatal: false,
    });
  });

  it('counts a wayland display as a display', () => {
    expect(
      detectBrowserAvailability({ WAYLAND_DISPLAY: 'wayland-0' }, 'linux')
    ).toEqual({ canLaunch: true });
  });
});
