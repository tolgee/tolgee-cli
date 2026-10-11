import {
  ALLOW_IN_CI,
  reasonBrowserLoginCannotWork,
} from '#cli/oauth/browserEnvironment.js';

describe('where a browser login cannot work', () => {
  it('is nowhere in particular outside CI', () => {
    expect(reasonBrowserLoginCannotWork({})).toBeUndefined();
    expect(
      reasonBrowserLoginCannotWork({ SSH_CONNECTION: '1 2 3 4' })
    ).toBeUndefined();
  });

  it('is a CI run, since nobody is there to approve', () => {
    for (const name of ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'JENKINS_URL']) {
      expect(reasonBrowserLoginCannotWork({ [name]: 'true' })).toMatch(/CI/);
    }
  });

  it.each(['false', '0', ''])('does not read CI=%s as a CI run', (value) => {
    expect(reasonBrowserLoginCannotWork({ CI: value })).toBeUndefined();
  });

  it('lets the user overrule the CI guess', () => {
    expect(
      reasonBrowserLoginCannotWork({ CI: 'true', [ALLOW_IN_CI]: '1' })
    ).toBeUndefined();
  });
});
