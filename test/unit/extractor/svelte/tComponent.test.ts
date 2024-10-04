import { extractTreeAndReport } from '#cli/extractor/extractor.js';
import { ExtractOptions } from '#cli/extractor/index.js';

const VERBOSE = false;

async function extractSvelteKeys(
  code: string,
  fileName: string,
  options?: Partial<ExtractOptions>
) {
  const { report } = await extractTreeAndReport(code, fileName, 'svelte', {
    strictNamespace: true,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });
  return report;
}

describe('<T>', () => {
  it('extracts keys specified as properties', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName='key1'/>
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as properties with curly braces', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName={'key1'}/>
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1', line: 3 },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName='key1' defaultValue='default value1'/>
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName='key1' ns='ns1'/>
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract from unrelated components', async () => {
    const expected = [{ keyName: 'key1', line: 4 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <div keyName='not key1'>
        <T keyName='key1'/>
      </div>
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('is undisturbed by objects in properties', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'value', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T defaultValue='value' properties={{ a: 'b' }} keyName='key1' />
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles multiline use', async () => {
    const expected = [
      {
        keyName: 'key1',
        namespace: 'ns1',
        defaultValue: 'default value1',
        line: 3,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T
        keyName='key1'
        ns='ns1'
        defaultValue='default value1'
      />
    `;

    const extracted = await extractSvelteKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 3 },
        { warning: 'W_DYNAMIC_KEY', line: 4 },
        { warning: 'W_DYNAMIC_KEY', line: 5 },
        { warning: 'W_DYNAMIC_KEY', line: 6 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
        { warning: 'W_DYNAMIC_KEY', line: 8 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <T keyName={\`dynamic-key-\${i}\`} />
        <T keyName={'dynamic-key-' + i} />
        <T keyName={key} />
        <T keyName={a.key} />
        <T keyName />
        <T keyName="dynamic-key-{i}" />
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <T keyName='key2' ns={'dynamic-ns-' + i} />
        <T keyName='key2' ns={ns} />
        <T keyName='key2' ns={a.ns} />
        <T keyName='key2' ns/>
        <T keyName='key2' ns="dynamic-ns-{i}"/>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning for dynamic default values, but extracts keys', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 3 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 4 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 5 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined, line: 3 },
        { keyName: 'key2', defaultValue: undefined, line: 4 },
        { keyName: 'key3', defaultValue: undefined, line: 5 },
        { keyName: 'key4', defaultValue: undefined, line: 6 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <T keyName='key1' defaultValue={someValue}/>
        <T keyName='key2' defaultValue={'dynamic-' + i}/>
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
        <T keyName='key4' defaultValue="dynamic-{i}"/>
      `;

      const extracted = await extractSvelteKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});
