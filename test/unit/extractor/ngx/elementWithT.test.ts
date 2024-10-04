import { extractTreeAndReport } from '#cli/extractor/extractor.js';
import { ExtractOptions } from '#cli/extractor/index.js';

const VERBOSE = false;

async function extractNgxKeys(
  code: string,
  fileName: string,
  options?: Partial<ExtractOptions>
) {
  const { report } = await extractTreeAndReport(code, fileName, 'ngx', {
    strictNamespace: true,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });
  return report;
}

describe('element with t param', () => {
  it('extracts calls to t in the template', async () => {
    const code = `
    <template>
      <h1 t key="key1"></h1>
    </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts keys specified binded properties', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <template>
        <h1 t [key]="'key1'"></h1>
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1', line: 3 },
    ];

    const code = `
      <template>
        <p t key="key1" default="default value1"></p>
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1', line: 3 }];

    const code = `
      <template>
        <p t key="key1" ns="ns1"/>
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract from unrelated components', async () => {
    const expected = [{ keyName: 'key1', line: 4 }];

    const code = `
      <template>
        <div key="not key1">
          <p t key="key1"/>
        </div>
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('is undisturbed by objects in properties', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'value', line: 3 }];

    const code = `
      <template>
        <p t default="value" [properties]="{ a: 'b' }" key="key1" />
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
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
      <template>
        <p
          t
          key="key1"
          ns="ns1"
          default="default value1"
        />
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
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
      ];

      const code = `
        <template>
          <p t [key]="\`dynamic-key-\${i}\`" />
          <p t [key]="'dynamic-key-' + i" />
          <p t [key]="key" />
          <p t key />
          <p t (key)="eventHandler" />
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
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
      ];

      const code = `
        <template>
          <p t key="key1" [ns]="\`dynamic-ns-\${i}\`" />
          <p t key="key2" [ns]="'dynamic-ns-' + i" />
          <p t key="key2" [ns]="ns" />
          <p t key="key2" ns/>
          <p t key="key2" (ns)="ns"/>
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
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
        <template>
          <p t key="key1" [default]="someValue"/>
          <p t key="key2" [default]="'dynamic-' + i"/>
          <p t key="key3" [default]="\`dynamic-\${i}\`"/>
          <p t key="key4" (default)="dv"/>
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});
