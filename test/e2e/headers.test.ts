import { tmpdir } from 'os';
import { join } from 'path';
import { rm } from 'fs/promises';
import { run } from './utils/run.js';

const AUTH_FILE_PATH = join(tmpdir(), '.tolgee-e2e', 'authentication.json');

// These cases fail at argument parsing / option validation, before any request,
// so they do not need a running backend.
beforeEach(async () => {
  try {
    await rm(AUTH_FILE_PATH);
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
});

describe('--extra-header', () => {
  it('rejects a malformed header with a clean validation error', async () => {
    const out = await run([
      'push',
      '--project-id',
      '1',
      '--api-key',
      'tgpak_dummy',
      '-H',
      'badheader',
    ]);

    expect(out.code).not.toBe(0);
    expect(`${out.stdout}${out.stderr}`).toMatch(/invalid header/i);
    // Must not fall through to the generic unexpected-error catch-all.
    expect(`${out.stdout}${out.stderr}`).not.toMatch(
      /report this to our issue/i
    );
  });

  it('still requires a Tolgee API key (headers are additive)', async () => {
    const out = await run(['push', '--project-id', '1', '-H', 'X-Foo: bar']);

    expect(out.code).toBe(1);
    expect(`${out.stdout}${out.stderr}`).toMatch(/not authenticated/i);
  });
});
