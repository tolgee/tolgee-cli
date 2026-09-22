import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync } from 'fs';
import { startOAuthStub, type OAuthStub } from './stubHttp.js';

type RevokeModule = typeof import('#cli/oauth/revoke.js');
type CredentialsModule = typeof import('#cli/config/credentials.js');

const CONFIG_DIR = mkdtempSync(join(tmpdir(), 'tolgee-cli-revoke-'));
process.env.TOLGEE_CLI_CONFIG_PATH = CONFIG_DIR;

let revoke: RevokeModule;
let credentials: CredentialsModule;

/** Port 1 is reserved, so nothing can be listening there. */
const NOTHING_IS_LISTENING = 'http://localhost:1/';

let warnings: string[] = [];

vi.mock('#cli/utils/logger.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#cli/utils/logger.js')>()),
  warn: (message: string) => warnings.push(String(message)),
}));

function headerValues(received: { [key: string]: unknown }[], name: string) {
  return received.map((headers) => headers[name]).filter(Boolean);
}

let instance: OAuthStub;
let apiUrl: URL;
let revoked: URLSearchParams[];
let revokeStatus: number;

beforeAll(async () => {
  revoke = await import('#cli/oauth/revoke.js');
  credentials = await import('#cli/config/credentials.js');
});

beforeEach(async () => {
  warnings = [];
  revokeStatus = 200;
  instance = await startOAuthStub(() => revokeStatus);
  revoked = instance.revoked;
  apiUrl = new URL(instance.origin);

  await credentials.clearAuthStore();
});

afterEach(async () => {
  await instance.close();
});

function session(overrides: Record<string, unknown> = {}) {
  return {
    type: 'oauth' as const,
    accessToken: 'tgoat_access',
    refreshToken: 'tgort_refresh',
    accessExpires: Date.now() + 60_000,
    scopes: ['translations.edit'],
    apiUrl: apiUrl.toString(),
    ...overrides,
  };
}

describe('revoking on logout', () => {
  it('ends the grant with the refresh token', async () => {
    await credentials.saveOAuthSession(apiUrl, session());

    await revoke.revokeSessionFor(apiUrl);

    expect(revoked).toHaveLength(1);
    expect(revoked[0].get('token')).toBe('tgort_refresh');
    expect(revoked[0].get('client_id')).toBe('tolgee-cli');
  });

  it('never sends a token to an instance that did not issue it', async () => {
    const other = await startOAuthStub();
    try {
      await credentials.saveOAuthSession(
        new URL(other.origin),
        session({ apiUrl: apiUrl.toString() })
      );

      await revoke.revokeSessionFor(new URL(other.origin));

      expect(other.revoked).toHaveLength(0);
      expect(revoked.map((body) => body.get('token'))).toEqual([
        'tgort_refresh',
      ]);
    } finally {
      await other.close();
    }
  });

  it('withholds the custom headers from an instance that did not issue the session', async () => {
    const other = await startOAuthStub();
    try {
      await credentials.saveOAuthSession(
        apiUrl,
        session({ apiUrl: other.origin })
      );

      await revoke.revokeSessionFor(apiUrl, { 'x-gateway': 'secret' });

      expect(other.revoked).toHaveLength(1);
      expect(headerValues(other.receivedHeaders, 'x-gateway')).toEqual([]);
    } finally {
      await other.close();
    }
  });

  it('says so when the stored instance URL cannot be used', async () => {
    await credentials.saveOAuthSession(
      apiUrl,
      session({ apiUrl: 'not a url' })
    );

    await revoke.revokeSessionFor(apiUrl);

    expect(revoked).toHaveLength(0);
    expect(warnings.join('\n')).toMatch(/not a url/);
  });

  it('says nothing to the server about an api key', async () => {
    await credentials.saveApiKey(apiUrl, {
      type: 'PAT',
      key: 'tgpat_x',
      username: 'tester',
      expires: 0,
    });

    await revoke.revokeSessionFor(apiUrl);

    expect(revoked).toHaveLength(0);
  });

  it('does not fail when the server refuses', async () => {
    revokeStatus = 400;
    await credentials.saveOAuthSession(apiUrl, session());

    await expect(revoke.revokeSessionFor(apiUrl)).resolves.toBeUndefined();
  });

  it('does not fail when the instance is unreachable', async () => {
    await credentials.saveOAuthSession(apiUrl, session());
    await instance.close();

    await expect(revoke.revokeSessionFor(apiUrl)).resolves.toBeUndefined();
  });

  it('keeps going when one stored instance URL is unusable', async () => {
    await credentials.saveOAuthSession(apiUrl, session());
    await credentials.saveOAuthSession(
      new URL('http://other.local'),
      session({ apiUrl: 'not a url', refreshToken: 'tgort_other' })
    );

    await revoke.revokeAllSessions();

    expect(revoked.map((body) => body.get('token'))).toEqual(['tgort_refresh']);
  });

  it('ends every session, each against the instance that issued it', async () => {
    await credentials.saveOAuthSession(apiUrl, session());
    await credentials.saveOAuthSession(
      new URL('http://other.local'),
      session({ refreshToken: 'tgort_other' })
    );

    await revoke.revokeAllSessions();

    expect(revoked.map((body) => body.get('token')).sort()).toEqual([
      'tgort_other',
      'tgort_refresh',
    ]);
  });

  it('sends the custom headers only to the instance they were configured for', async () => {
    const other = await startOAuthStub();
    try {
      await credentials.saveOAuthSession(apiUrl, session());
      await credentials.saveOAuthSession(
        new URL('http://other.local'),
        session({ apiUrl: other.origin, refreshToken: 'tgort_other' })
      );

      await revoke.revokeAllSessions({
        instance: apiUrl,
        headers: { 'x-gateway': 'secret' },
      });

      expect(headerValues(instance.receivedHeaders, 'x-gateway')).toContain(
        'secret'
      );
      expect(headerValues(other.receivedHeaders, 'x-gateway')).toEqual([]);
      expect(other.revoked).toHaveLength(1);
    } finally {
      await other.close();
    }
  });

  it('ends the reachable ones when another instance is down', async () => {
    await credentials.saveOAuthSession(apiUrl, session());
    await credentials.saveOAuthSession(
      new URL(NOTHING_IS_LISTENING),
      session({ apiUrl: NOTHING_IS_LISTENING, refreshToken: 'tgort_other' })
    );

    await revoke.revokeAllSessions();

    expect(revoked.map((body) => body.get('token'))).toEqual(['tgort_refresh']);
  });
});
