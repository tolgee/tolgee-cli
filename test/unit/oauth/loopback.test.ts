import { connect } from 'net';
import {
  startLoopbackServer,
  type LoopbackServer,
} from '#cli/oauth/loopback.js';

const STATE = 'the-state';
const ISSUER = 'https://app.tolgee.io';

let server: LoopbackServer;

beforeEach(async () => {
  server = await startLoopbackServer();
});

afterEach(async () => {
  await server.close();
});

/** Node's parser accepts request targets that `URL` refuses; fetch cannot send one. */
function rawRequest(target: string) {
  const { port } = new URL(server.redirectUri);
  return new Promise<string>((resolve, reject) => {
    let reply = '';
    const socket = connect(Number(port), '127.0.0.1', () => {
      socket.write(
        `GET ${target} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`
      );
    });
    socket.on('data', (chunk) => (reply += chunk));
    socket.on('end', () => resolve(reply));
    socket.on('error', reject);
  });
}

function callback(query: Record<string, string>) {
  const url = new URL(server.redirectUri);
  for (const [name, value] of Object.entries(query)) {
    url.searchParams.set(name, value);
  }
  return fetch(url);
}

describe('loopback listener', () => {
  it('ignores a request whose target does not parse, and keeps listening', async () => {
    const waiting = server.waitForCode({ state: STATE });

    const reply = await rawRequest('//[');

    expect(reply).toMatch(/^HTTP\/1\.1 404/);
    await callback({ code: 'the-code', state: STATE });
    expect(await waiting).toBe('the-code');
  });

  it('listens on a loopback address and an OS-assigned port', () => {
    const url = new URL(server.redirectUri);

    expect(url.hostname).toBe('127.0.0.1');
    expect(url.pathname).toBe('/callback');
    expect(Number(url.port)).toBeGreaterThan(0);
  });

  it('hands over the code the browser arrives with', async () => {
    const waiting = server.waitForCode({ state: STATE, issuer: ISSUER });

    const response = await callback({
      code: 'the-code',
      state: STATE,
      iss: ISSUER,
    });

    expect(await waiting).toBe('the-code');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('ignores a request that does not carry this authorization state', async () => {
    const waiting = server.waitForCode({ state: STATE });

    const wrong = await callback({ code: 'other-code', state: 'other-state' });
    expect(wrong.status).toBe(404);

    await callback({ code: 'the-code', state: STATE });
    expect(await waiting).toBe('the-code');
  });

  it('ignores everything outside the callback path', async () => {
    server.waitForCode({ state: STATE });

    const response = await fetch(new URL('/', server.redirectUri));

    expect(response.status).toBe(404);
  });

  it('lets only the first callback win', async () => {
    const waiting = server.waitForCode({ state: STATE });
    await callback({ code: 'the-code', state: STATE });
    await waiting;

    const second = await callback({ code: 'second-code', state: STATE });

    expect(second.status).toBe(404);
  });

  it('refuses an authorization response from another issuer', async () => {
    // The assertion has to be attached before the request that rejects: an
    // await in between leaves the rejection unobserved for a tick, which node
    // reports as an unhandled rejection.
    const waiting = expect(
      server.waitForCode({ state: STATE, issuer: ISSUER })
    ).rejects.toMatchObject({ kind: 'oauth' });

    await callback({
      code: 'the-code',
      state: STATE,
      iss: 'https://evil.example',
    });

    await waiting;
  });

  it('surfaces the error the authorization server sent back', async () => {
    const waiting = expect(
      server.waitForCode({ state: STATE })
    ).rejects.toMatchObject({
      kind: 'oauth',
      message: 'user denied the request',
    });

    const response = await callback({
      error: 'access_denied',
      error_description: 'user denied the request',
      state: STATE,
    });

    await waiting;
    expect(response.status).toBe(400);
  });

  it('refuses a callback that carries neither code nor error', async () => {
    const waiting = expect(
      server.waitForCode({ state: STATE })
    ).rejects.toMatchObject({ kind: 'oauth' });

    await callback({ state: STATE });

    await waiting;
  });

  it('gives up once the browser stops being worth waiting for', async () => {
    const shortLived = await startLoopbackServer({ timeoutMs: 10 });

    await expect(
      shortLived.waitForCode({ state: STATE })
    ).rejects.toMatchObject({ kind: 'network' });

    await shortLived.close();
  });

  it('stops listening once closed', async () => {
    const closing = await startLoopbackServer();
    const uri = closing.redirectUri;
    await closing.close();

    await expect(fetch(uri)).rejects.toThrow();
  });
});
