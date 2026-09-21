import { getAuthentication } from '#cli/client/WebsocketClient.js';

// The STOMP connect headers are the second place the CLI authenticates; the REST client is the first. A token that
// only reaches one of them makes `pull --watch` fail in a way no REST test can see.
describe('websocket authentication', () => {
  it('sends an api key as x-api-key', () => {
    expect(
      getAuthentication({ authentication: { apiKey: 'tgpak_x' } })
    ).toEqual({ 'x-api-key': 'tgpak_x' });
  });

  it('sends an access token as a bearer credential', () => {
    expect(
      getAuthentication({
        authentication: { getAccessToken: () => 'tgoat_token' },
      })
    ).toEqual({ authorization: 'Bearer tgoat_token' });
  });

  it('asks for the token on every connect', () => {
    const tokens = ['tgoat_first', 'tgoat_second'];
    const options = {
      authentication: { getAccessToken: () => tokens.shift() },
    };

    expect(getAuthentication(options)).toEqual({
      authorization: 'Bearer tgoat_first',
    });
    expect(getAuthentication(options)).toEqual({
      authorization: 'Bearer tgoat_second',
    });
  });

  it('falls back to the api key when there is no session', () => {
    expect(
      getAuthentication({
        authentication: { apiKey: 'tgpak_x', getAccessToken: () => undefined },
      })
    ).toEqual({ 'x-api-key': 'tgpak_x' });
  });

  it('sends nothing when there is no credential at all', () => {
    expect(getAuthentication({ authentication: {} })).toEqual({});
  });
});
