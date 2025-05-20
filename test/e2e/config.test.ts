import { run } from './utils/run.js';
import { createTmpFolderWithConfig } from './utils/tmp.js';

describe('config validation', () => {
  it('schema validation will fail on invalid format', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      // @ts-ignore
      format: 'NONSENSE',
    });
    const out = await run(['-c', configFile, 'help']);
    expect(out.code).toBe(1);
    expect(out.stdout.toString()).toContain("'format'");
  });

  it('schema validation will fail on invalid project id', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      // @ts-ignore
      projectId: {},
    });
    const out = await run(['-c', configFile, 'help']);
    expect(out.code).toBe(1);
    expect(out.stdout.toString()).toContain("'projectId'");
  });

  it('schema validation will fail on invalid parser', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      // @ts-ignore
      parser: 'jQuery',
    });
    const out = await run(['-c', configFile, 'help']);
    expect(out.code).toBe(1);
    expect(out.stdout.toString()).toContain("'parser'");
  });

  it('schema validation will fail on invalid forceMode', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      push: {
        // @ts-ignore
        forceMode: 'NONSENSE',
      },
    });
    const out = await run(['-c', configFile, 'help']);
    expect(out.code).toBe(1);
    expect(out.stdout.toString()).toContain("'push.forceMode'");
  });

  it('schema validation will not fail on unknown property (for future extensibility)', async () => {
    const { configFile } = await createTmpFolderWithConfig({
      // @ts-ignore
      unknown: 'test',
    });
    const out = await run(['-c', configFile, 'help']);
    expect(out.code).toBe(0);
  });
});
