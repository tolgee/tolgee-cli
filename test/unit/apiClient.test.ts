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
