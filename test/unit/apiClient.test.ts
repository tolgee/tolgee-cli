import { createApiClient } from '#cli/client/ApiClient.js';
import { createTolgeeClient } from '#cli/client/TolgeeClient.js';
import { USER_AGENT } from '#cli/constants.js';

let captured: Request | undefined;

beforeEach(() => {
  captured = undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      captured = request;
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

type Props = Parameters<typeof createApiClient>[0];

// Fires a GET and returns the Request openapi-fetch actually handed to fetch.
async function get(props: Omit<Props, 'baseUrl'>): Promise<Request> {
  const client = createApiClient({ baseUrl: 'http://localhost', ...props });
  await (client as any).GET('/v2/projects');
  if (!captured) throw new Error('no request was captured');
  return captured;
}

describe('createApiClient headers', () => {
  it('forwards an arbitrary custom header to the request', async () => {
    const req = await get({ headers: { 'x-foo': 'bar' } });
    expect(req.headers.get('x-foo')).toBe('bar');
  });

  it('forwards multiple custom headers', async () => {
    const req = await get({
      headers: { 'x-a': '1', authorization: 'Bearer token' },
    });
    expect(req.headers.get('x-a')).toBe('1');
    expect(req.headers.get('authorization')).toBe('Bearer token');
  });

  it('keeps its own user-agent even if a custom one is supplied', async () => {
    const req = await get({
      apiKey: 'tgpak_test',
      headers: { 'user-agent': 'evil-bot' },
    });
    expect(req.headers.get('user-agent')).toBe(USER_AGENT);
  });

  it('uses the resolved api key, ignoring a custom x-api-key', async () => {
    const req = await get({
      apiKey: 'tgpak_test',
      headers: { 'x-api-key': 'bogus' },
    });
    expect(req.headers.get('x-api-key')).toBe('tgpak_test');
  });

  it('drops a custom x-api-key when no api key is resolved', async () => {
    const req = await get({ headers: { 'x-api-key': 'bogus' } });
    expect(req.headers.get('x-api-key')).toBeNull();
  });

  it('sends no x-api-key when none is supplied', async () => {
    const req = await get({});
    expect(req.headers.get('x-api-key')).toBeNull();
  });

  it('strips a custom content-type regardless of its casing', async () => {
    const req = await get({ headers: { 'Content-Type': 'text/xml' } });
    expect(req.headers.get('content-type')).not.toBe('text/xml');
  });

  it('lets openapi-fetch set application/json on a JSON body', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost',
      headers: { 'content-type': 'text/xml' },
    });
    await (client as any).POST('/v2/projects', { body: { name: 'x' } });
    expect(captured!.headers.get('content-type')).toBe('application/json');
  });

  it('lets the runtime set the multipart boundary on a FormData upload', async () => {
    const client = createTolgeeClient({
      baseUrl: 'http://localhost',
      projectId: 1,
      headers: { 'content-type': 'text/xml' },
    });
    await client.import.import({
      files: [{ name: 'en.json', data: '{}' }],
      params: { fileMappings: [] },
    } as any);
    expect(captured!.headers.get('content-type')).toMatch(
      /^multipart\/form-data; boundary=/
    );
  });

  it('forwards custom headers to import/export sub-client requests', async () => {
    const client = createTolgeeClient({
      baseUrl: 'http://localhost',
      projectId: 1,
      headers: { 'x-foo': 'bar' },
    });
    await client.import.import({
      files: [{ name: 'en.json', data: '{}' }],
      params: { fileMappings: [] },
    } as any);
    expect(captured!.headers.get('x-foo')).toBe('bar');
  });

  it('round-trips custom headers through getSettings()', () => {
    const settings = createApiClient({
      baseUrl: 'http://localhost',
      headers: { 'x-foo': 'bar' },
    }).getSettings();
    expect(settings.headers).toEqual({ 'x-foo': 'bar' });
  });
});

describe('createApiClient OAuth', () => {
  it('sends the access token as a bearer credential', async () => {
    const req = await get({ getAccessToken: () => 'tgoat_token' });
    expect(req.headers.get('authorization')).toBe('Bearer tgoat_token');
    expect(req.headers.get('x-api-key')).toBeNull();
  });

  it('reads the token again for every request', async () => {
    const tokens = ['tgoat_first', 'tgoat_second'];
    const client = createApiClient({
      baseUrl: 'http://localhost',
      getAccessToken: () => tokens.shift(),
    });

    await (client as any).GET('/v2/projects');
    const first = captured!.headers.get('authorization');
    await (client as any).GET('/v2/projects');
    const second = captured!.headers.get('authorization');

    expect(first).toBe('Bearer tgoat_first');
    expect(second).toBe('Bearer tgoat_second');
  });

  it('sends no authorization header when there is no token', async () => {
    const req = await get({ getAccessToken: () => undefined });
    expect(req.headers.get('authorization')).toBeNull();
  });

  it('lets an explicit authorization header win over the session', async () => {
    const req = await get({
      getAccessToken: () => 'tgoat_token',
      headers: { authorization: 'Bearer supplied' },
    });
    expect(req.headers.get('authorization')).toBe('Bearer supplied');
  });
});

describe('createApiClient 401 replay', () => {
  function stubFetch(statuses: number[], seen: any[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        seen.push({
          authorization: request.headers.get('authorization'),
          body: await request.clone().text(),
        });
        return new Response('{}', {
          status: statuses[seen.length - 1] ?? 200,
          headers: { 'content-type': 'application/json' },
        });
      })
    );
  }

  it('sends the request again with the token the refresh produced', async () => {
    const seen: any[] = [];
    stubFetch([401, 200], seen);
    let token = 'tgoat_old';

    const client = createApiClient({
      baseUrl: 'http://localhost',
      getAccessToken: () => token,
      onUnauthorized: async () => {
        token = 'tgoat_new';
        return true;
      },
    });
    await (client as any).GET('/v2/projects');

    expect(seen.map((call) => call.authorization)).toEqual([
      'Bearer tgoat_old',
      'Bearer tgoat_new',
    ]);
  });

  it('replays the body too', async () => {
    const seen: any[] = [];
    stubFetch([401, 200], seen);
    let token = 'tgoat_old';

    const client = createApiClient({
      baseUrl: 'http://localhost',
      getAccessToken: () => token,
      onUnauthorized: async () => {
        token = 'tgoat_new';
        return true;
      },
    });
    await (client as any).POST('/v2/projects', { body: { name: 'a project' } });

    expect(seen).toHaveLength(2);
    expect(seen[1].body).toBe(seen[0].body);
    expect(seen[1].body).toContain('a project');
  });

  it('gives up when the session could not be refreshed', async () => {
    const seen: any[] = [];
    stubFetch([401, 200], seen);

    const client = createApiClient({
      baseUrl: 'http://localhost',
      getAccessToken: () => 'tgoat_old',
      onUnauthorized: async () => false,
    });
    await (client as any).GET('/v2/projects');

    expect(seen).toHaveLength(1);
  });

  it('never replays an api key request', async () => {
    const seen: any[] = [];
    stubFetch([401, 200], seen);
    const onUnauthorized = vi.fn(async () => true);

    const client = createApiClient({
      baseUrl: 'http://localhost',
      apiKey: 'tgpak_test',
      onUnauthorized,
    });
    await (client as any).GET('/v2/projects');

    expect(seen).toHaveLength(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('createApiClient settings', () => {
  it('round-trips the browser session, so a rebuilt client still authenticates', async () => {
    const getAccessToken = () => 'tgoat_token';
    const settings = createApiClient({
      baseUrl: 'http://localhost',
      getAccessToken,
    }).getSettings();

    const req = await get(settings);

    expect(settings.getAccessToken).toBe(getAccessToken);
    expect(req.headers.get('authorization')).toBe('Bearer tgoat_token');
  });
});
