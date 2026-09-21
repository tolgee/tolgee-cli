import ansi from 'ansi-colors';
import { createServer, type Server } from 'http';

import { CI_VARIABLES } from '#cli/oauth/browserEnvironment.js';
import { browserLogin } from '#cli/oauth/browserLogin.js';
import {
  closeServer,
  jsonWriter,
  listenOnLoopback,
  readBody,
} from './stubHttp.js';

type StubOptions = {
  discoveryStatus?: number;
  scopesSupported?: string[];
};

type TokenRequest = { url: string; body: URLSearchParams };

let server: Server;
let origin: string;
let lastAuthorizeUrl: string | undefined;
let printed: string[];
let tokenRequests: TokenRequest[];
let stub: StubOptions;

beforeEach(async () => {
  tokenRequests = [];
  stub = {};
  lastAuthorizeUrl = undefined;
  printed = [];
  vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
    const line = args.map(String).join(' ');
    printed.push(line);
    // The URL is printed in colour, and the reset sequence would otherwise end
    // up inside it.
    const match = /(http:\/\/\S*oauth2\/authorize\S*)/.exec(ansi.unstyle(line));
    if (match) lastAuthorizeUrl = match[1];
  });

  server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const json = jsonWriter(response);

    if (url.pathname === '/.well-known/oauth-authorization-server') {
      if (stub.discoveryStatus) {
        json(stub.discoveryStatus, { error: 'nope' });
        return;
      }
      json(200, {
        ...(stub.scopesSupported
          ? { scopes_supported: stub.scopesSupported }
          : {}),
        issuer: origin,
        authorization_endpoint: `${origin}/oauth2/authorize`,
        token_endpoint: `${origin}/oauth2/token`,
        revocation_endpoint: `${origin}/oauth2/revoke`,
      });
      return;
    }

    if (url.pathname === '/oauth2/token') {
      tokenRequests.push({
        url: request.url!,
        body: new URLSearchParams(await readBody(request)),
      });
      json(200, {
        access_token: 'tgoat_access',
        refresh_token: 'tgort_refresh',
        token_type: 'Bearer',
        expires_in: 1800,
        scope: 'translations.edit',
      });
      return;
    }

    json(404, { error: 'not_found' });
  });

  origin = await listenOnLoopback(server);
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await closeServer(server);
});

function browserThat(
  answer: (params: URLSearchParams) => Record<string, string>
) {
  return async (authorizeUrl: string) => {
    const params = new URL(authorizeUrl).searchParams;
    const callback = new URL(params.get('redirect_uri')!);
    for (const [name, value] of Object.entries(answer(params))) {
      callback.searchParams.set(name, value);
    }
    await fetch(callback);
  };
}

function approval(params: URLSearchParams) {
  return { code: 'the-code', state: params.get('state')!, iss: origin };
}

const approving = () => browserThat(approval);

const askedFor = () => new URL(lastAuthorizeUrl!).searchParams;

async function approveThePrintedUrl() {
  await new Promise((resolve) => setTimeout(resolve, 20));
  await approving()(lastAuthorizeUrl!);
}

describe('browser login', () => {
  it('returns the token pair the authorization produced', async () => {
    const tokens = await browserLogin({
      apiUrl: new URL(origin),
      openBrowser: approving(),
    });

    expect(tokens.accessToken).toBe('tgoat_access');
    expect(tokens.refreshToken).toBe('tgort_refresh');
    expect(tokens.scopes).toEqual(['translations.edit']);
  });

  it('asks for the code as the pre-registered CLI client, with PKCE', async () => {
    await browserLogin({
      apiUrl: new URL(origin),
      project: '12',
      openBrowser: approving(),
    });

    const authorizeParams = askedFor();
    expect(authorizeParams.get('client_id')).toBe('tolgee-cli');
    expect(authorizeParams.get('code_challenge_method')).toBe('S256');
    expect(authorizeParams.get('project')).toBe('12');
    expect(authorizeParams.get('scope')).toContain('translations.edit');
    expect(new URL(authorizeParams.get('redirect_uri')!).hostname).toBe(
      '127.0.0.1'
    );
  });

  it('exchanges the code with the verifier behind the challenge it sent', async () => {
    await browserLogin({
      apiUrl: new URL(origin),
      openBrowser: approving(),
    });

    const challenge = askedFor().get('code_challenge')!;
    const { body } = tokenRequests[0];
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('client_id')).toBe('tolgee-cli');

    const { createHash } = await import('crypto');
    expect(
      createHash('sha256')
        .update(body.get('code_verifier')!)
        .digest('base64url')
    ).toBe(challenge);
  });

  it('stops listening once the login is over', async () => {
    await browserLogin({
      apiUrl: new URL(origin),
      openBrowser: approving(),
    });

    const callbackUrl = askedFor().get('redirect_uri')!;
    await expect(fetch(callbackUrl)).rejects.toThrow();
  });

  it('reports an instance that runs no authorization server', async () => {
    stub.discoveryStatus = 404;

    await expect(
      browserLogin({ apiUrl: new URL(origin), openBrowser: approving() })
    ).rejects.toMatchObject({ kind: 'unsupported' });
  });

  it('surfaces a denied consent', async () => {
    await expect(
      browserLogin({
        apiUrl: new URL(origin),
        openBrowser: browserThat((params) => ({
          error: 'access_denied',
          state: params.get('state')!,
        })),
      })
    ).rejects.toMatchObject({ kind: 'oauth', message: 'access_denied' });
  });
});

/**
 * The suite itself usually runs in CI, where a browser login is refused
 * outright.
 */
function outsideCi() {
  for (const name of CI_VARIABLES) {
    vi.stubEnv(name, '');
  }
}

describe('browser login without a browser', () => {
  it('refuses before binding a port when there is no way to approve', async () => {
    vi.stubEnv('CI', 'true');

    await expect(
      browserLogin({ apiUrl: new URL(origin) })
    ).rejects.toMatchObject({ kind: 'no-browser' });
  });

  it('refuses in CI even when the launch is suppressed, rather than waiting 15 minutes', async () => {
    vi.stubEnv('CI', 'true');

    await expect(
      browserLogin({ apiUrl: new URL(origin), allowBrowserLaunch: false })
    ).rejects.toMatchObject({ kind: 'no-browser' });
  });

  it('still listens when the launch is suppressed', async () => {
    outsideCi();
    const login = browserLogin({
      apiUrl: new URL(origin),
      allowBrowserLaunch: false,
    });
    await approveThePrintedUrl();

    await expect(login).resolves.toMatchObject({
      accessToken: 'tgoat_access',
    });
  });
});

describe('browser login against an instance with fewer scopes', () => {
  it('asks only for what the instance publishes', async () => {
    stub.scopesSupported = ['translations.edit', 'keys.create'];
    await browserLogin({
      apiUrl: new URL(origin),
      openBrowser: approving(),
    });

    expect(askedFor().get('scope')!.split(' ').sort()).toEqual([
      'keys.create',
      'translations.edit',
    ]);
  });

  it('refuses before opening a browser when none of them are offered', async () => {
    stub.scopesSupported = ['admin'];

    await expect(
      browserLogin({ apiUrl: new URL(origin), openBrowser: approving() })
    ).rejects.toMatchObject({ kind: 'unsupported' });
  });

  it('names what it had to drop', async () => {
    stub.scopesSupported = ['translations.edit'];

    await browserLogin({
      apiUrl: new URL(origin),
      openBrowser: approving(),
    });

    expect(printed.join('\n')).toContain('branch.management');
  });

  it('asks for everything when the instance publishes no list', async () => {
    await browserLogin({
      apiUrl: new URL(origin),
      openBrowser: approving(),
    });

    expect(askedFor().get('scope')).toContain('branch.protected-modify');
  });
});

describe('browser login when the browser will not open', () => {
  it('keeps waiting after a failed launch, so the printed URL still works', async () => {
    const login = browserLogin({
      apiUrl: new URL(origin),
      openBrowser: async () => {
        throw new Error('no browser here');
      },
    });

    await approveThePrintedUrl();

    await expect(login).resolves.toMatchObject({ accessToken: 'tgoat_access' });
  });

  it('does not launch one in an SSH session, and finishes anyway', async () => {
    outsideCi();
    vi.stubEnv('SSH_CONNECTION', '1 2 3 4');

    const login = browserLogin({
      apiUrl: new URL(origin),
      allowBrowserLaunch: true,
    });

    await approveThePrintedUrl();

    await expect(login).resolves.toMatchObject({
      accessToken: 'tgoat_access',
    });
    expect(printed.join('\n')).toContain('Open this URL in a browser');
    expect(printed.join('\n')).not.toContain('Opening ');
  });
});
