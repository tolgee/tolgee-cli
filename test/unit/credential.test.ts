import { credentialHeaders } from '#cli/client/credential.js';

function sessionOf(token: string | undefined, next?: () => string) {
  return {
    getAccessToken: () => (next ? next() : (token as string)),
    getProjectId: () => undefined,
    ensureFresh: async () => {},
    refreshAfterUnauthorized: async () => 'refreshed' as const,
    adoptNewerSession: async () => false,
  };
}

describe('credential headers', () => {
  it('sends an api key as x-api-key', () => {
    expect(credentialHeaders({ apiKey: 'tgpak_x' }).headers).toEqual({
      'x-api-key': 'tgpak_x',
    });
  });

  it('sends an access token as a bearer credential', () => {
    expect(
      credentialHeaders({ session: sessionOf('tgoat_token') }).headers
    ).toEqual({ authorization: 'Bearer tgoat_token' });
  });

  it('asks for the token on every call', () => {
    const tokens = ['tgoat_first', 'tgoat_second'];
    const credential = {
      session: sessionOf(undefined, () => tokens.shift() as string),
    };

    expect(credentialHeaders(credential).headers).toEqual({
      authorization: 'Bearer tgoat_first',
    });
    expect(credentialHeaders(credential).headers).toEqual({
      authorization: 'Bearer tgoat_second',
    });
  });

  it('falls back to the api key when the session has no token', () => {
    expect(
      credentialHeaders({ apiKey: 'tgpak_x', session: sessionOf(undefined) })
        .headers
    ).toEqual({ 'x-api-key': 'tgpak_x' });
  });

  it('sends nothing when there is no credential at all', () => {
    expect(credentialHeaders({}).headers).toEqual({});
  });
});
