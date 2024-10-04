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

describe('translate pipe', () => {
  it('extracts use of translate in the template', async () => {
    const code = `
      <div>
        {{ 'key1' | translate }}
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts use of translate in the attribute', async () => {
    const code = `
      <div>
        <div [innerHTML]="'key1' | translate"></div>
        <div [innerHTML]="'key2' | translate" attr></div>
        <div [innerHTML]="'key3' | translate" attr="test"></div>
        <div [innerHTML]="'key4' | translate" />
        <div [(test.test)]="'key5' | translate" />
        <div [(argument.test)]="test" [innerHTML]="'key6' | translate" [(another.argument)]="test" />
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 3 },
      { keyName: 'key2', line: 4 },
      { keyName: 'key3', line: 5 },
      { keyName: 'key4', line: 6 },
      { keyName: 'key5', line: 7 },
      { keyName: 'key6', line: 8 },
    ]);
  });

  it('extracts use of translate with object as input', async () => {
    const code = `
      <div>
        {{ { key: 'key1', ns: 'namespace', defaultValue: 'Default value' } | translate }}
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      {
        keyName: 'key1',
        defaultValue: 'Default value',
        namespace: 'namespace',
        line: 3,
      },
    ]);
  });

  it('extracts use of translate in parameter', async () => {
    const code = `
      <div>
        <p title="{{'key1' | translate}}">owo?</p>
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts translate pipe with default value', async () => {
    const code = `
      <div>
        {{ 'key1' | translate:'default value'}}
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', defaultValue: 'default value', line: 3 },
    ]);
  });

  it('extracts calls to $t(string, string, opts)', async () => {
    const code = `
      <div>
        {{ 'key1' | translate:{ ns: 'ns', defaultValue: 'ignored' }:'default value' }}
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      {
        keyName: 'key1',
        namespace: 'ns',
        defaultValue: 'default value',
        line: 3,
      },
    ]);
  });

  it('handles weird spacing', async () => {
    const code = `
      <div>
        {{ 'key1'   |   translate }}
        {{ 'key2' 
                  | translate }}
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 3 },
      { keyName: 'key2', line: 5 },
    ]);
  });

  it('is not confused by parameters', async () => {
    const code = `
      <template>
        {{ 'key1' | translate:{ params: { key: 'not_key1' } } }}
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('is not confused by key in parentheses', async () => {
    const code = `
      <template>
        {{ ('key1') | translate:{ params: { key: 'not_key1' } } }}
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('handles nested pipe', async () => {
    const code = `
      <template>
        {{ ('key1' | translate:{ params: { key: 'not_key1' } }) }}
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('handles multiple pipes', async () => {
    const code = `
      <template>
        {{
          ('key1' | translate:{ params: { key: 'not_key1' } })
          + ('key2' | translate:{ params: { key: 'not_key1' } })
        }}
      </template>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 4 },
      { keyName: 'key2', line: 5 },
    ]);
  });

  describe('dynamic data', () => {
    it('emits a warning on dynamic key', async () => {
      const code = `
        <template>
          {{ \`dynamic-key-\${i}\` | translate }}
          {{ ('dynamic-key-' + i) | translate }}
          {{ key | translate }}
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_KEY', line: 3 },
        { warning: 'W_DYNAMIC_KEY', line: 4 },
        { warning: 'W_DYNAMIC_KEY', line: 5 },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits a warning on dynamic namespace', async () => {
      const code = `
        <template>
          {{ 'key1' | translate:{ ns: \`dynamic-ns-\${i}\` } }}
          {{ 'key2' | translate:{ ns: 'dynamic-ns-' + i } }}
          {{ 'key2' | translate:{ ns: ns } }}
          {{ 'key2' | translate:{ ns } }}
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits a warning on dynamic default value but keeps the key', async () => {
      const code = `
        <template>
          {{ 'key1' | translate:{}:('dynamic-' + i) }}
          {{ 'key2' | translate:{}:\`dynamic-\${i}\` }}
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 3 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 4 },
      ]);
      expect(extracted.keys).toEqual([
        { keyName: 'key1', defaultValue: undefined, line: 3 },
        { keyName: 'key2', defaultValue: undefined, line: 4 },
      ]);
    });

    it('emits a warning on dynamic options', async () => {
      const code = `
        <template>
          {{ 'key1' | translate:someValue }}
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([
        {
          warning: 'W_DYNAMIC_OPTIONS',
          line: 3,
        },
      ]);
      expect(extracted.keys).toEqual([]);
    });
  });
});
