import { authentication } from '#cli/client/WebsocketClient.js';

function sessionOf(token: string | undefined, next?: () => string) {
  return {
    getAccessToken: () => (next ? next() : (token as string)),
    getUserName: () => undefined,
    ensureFresh: async () => {},
    refreshAfterUnauthorized: async () => false,
  };
}

function headersOf(options: any) {
  return authentication(options).headers;
}

describe('websocket authentication', () => {
  it('sends an api key as x-api-key', () => {
    expect(headersOf({ authentication: { apiKey: 'tgpak_x' } })).toEqual({
      'x-api-key': 'tgpak_x',
    });
  });

  it('sends an access token as a bearer credential', () => {
    expect(
      headersOf({
        authentication: { session: sessionOf('tgoat_token') },
      })
    ).toEqual({ authorization: 'Bearer tgoat_token' });
  });

  it('asks for the token on every connect', () => {
    const tokens = ['tgoat_first', 'tgoat_second'];
    const options = {
      authentication: {
        session: sessionOf(undefined, () => tokens.shift() as string),
      },
    };

    expect(headersOf(options)).toEqual({
      authorization: 'Bearer tgoat_first',
    });
    expect(headersOf(options)).toEqual({
      authorization: 'Bearer tgoat_second',
    });
  });

  it('falls back to the api key when there is no session', () => {
    expect(
      headersOf({
        authentication: { apiKey: 'tgpak_x', session: sessionOf(undefined) },
      })
    ).toEqual({ 'x-api-key': 'tgpak_x' });
  });

  it('sends nothing when there is no credential at all', () => {
    expect(headersOf({ authentication: {} })).toEqual({});
  });
});
