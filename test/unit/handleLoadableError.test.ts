import {
  handleLoadableError,
  LoadableError,
} from '#cli/client/TolgeeClient.js';

describe('handleLoadableError', () => {
  it('does not throw for a successful response', () => {
    const loadable = {
      data: {},
      response: new Response('{}', { status: 200 }),
    };
    expect(() => handleLoadableError(loadable as any)).not.toThrow();
  });

  it('throws for an error response with a parsed body', () => {
    const loadable = {
      error: { code: 'operation_not_permitted' },
      response: new Response(null, { status: 403 }),
    };
    expect(() => handleLoadableError(loadable as any)).toThrow(LoadableError);
  });

  it('throws for a rate limit response with an empty body', () => {
    // openapi-fetch leaves `error` undefined when the body is empty
    // (e.g. 429 responses from a proxy), see issue #208
    const loadable = {
      error: undefined,
      response: new Response(null, { status: 429 }),
    };
    expect(() => handleLoadableError(loadable as any)).toThrow(/rate limited/);
  });

  it('throws for an error response with an empty string body', () => {
    const loadable = {
      error: '',
      response: new Response('', { status: 444 }),
    };
    expect(() => handleLoadableError(loadable as any)).toThrow(LoadableError);
  });
});
