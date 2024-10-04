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

describe('magic comments', () => {
  describe('@tolgee-ignore', () => {
    it('ignores translate pipe', async () => {
      const code = `
        <template>
          <!-- @tolgee-ignore -->
          {{ 'not_a_key' | translate }}
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores element with t', async () => {
      const code = `
        <template>
          <!-- @tolgee-ignore -->
          <p t key="hello-world" />
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores translate function', async () => {
      const code = `
        class AppComponent {
          async ngOnInit(): Promise<void> {
            // @tolgee-ignore
            this.translateService.translate('hello-world');

            /* 
             * @tolgee-ignore
             */
            this.translateService.translate('hello-world');

            /* @tolgee-ignore */
            this.translateService.translate('hello-world');

            this.translateService
              // @tolgee-ignore
              .translate('hello-world');
          }
        }
      `;

      const extracted = await extractNgxKeys(code, 'test.ts');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning upon unused marker', async () => {
      const expected = [{ warning: 'W_UNUSED_IGNORE', line: 3 }];

      const code = `
        <template>
          <!-- @tolgee-ignore -->
          <div>uwu</div>
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses direct translate pipe warnings', async () => {
      const code = `
        <template>
          <!-- @tolgee-ignore -->
          {{ \`dynamic-key-\${i}\` | translate }}
          <!-- @tolgee-ignore -->
          {{ 'key1' | translate:{ ns: \`dynamic-ns-\${i}\` } }}
          <!-- @tolgee-ignore -->
          {{ 'key2' | translate:\`dynamic-\${i}\` }}
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses warnings of element with t', async () => {
      const code = `
        <template>
          <!-- @tolgee-ignore -->
          <p t [key]="\`dynamic-key-\${i}\`" />
          <!-- @tolgee-ignore -->
          <p t key="key1" [ns]="\`dynamic-ns-\${i}\`" />
          <!-- @tolgee-ignore -->
          <p t key="key3" [defaultValue]="\`dynamic-\${i}\`"/>
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });
  });

  describe('@tolgee-key', () => {
    it('extracts keys specified as comments', async () => {
      const expected = [{ keyName: 'key1', line: 3 }];

      const code = `
        <template>
          <!-- @tolgee-key key1 -->
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.keys).toEqual(expected);
    });

    it('overrides data from template', async () => {
      const expected = [
        { keyName: 'key-override-1', line: 3 },
        { keyName: 'key-override-2', namespace: undefined, line: 5 },
      ];

      const code = `
        <template>
          <!-- @tolgee-key key-override-1 -->
          <p t key="key-props-1" />
          <!-- @tolgee-key key-override-2 -->
          <p [title]="{{'key-props-2' | translate}}">owo?</p>
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual(expected);
    });

    it("doesn't extract json5 if escaped", async () => {
      const expected = [{ keyName: '{key}', line: 3 }];

      const code = `
        <template>
          <!-- @tolgee-key \\{key} -->
          <p t key="key-props-1" />
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it('suppresses warnings of element with t', async () => {
      const code = `
        <template>
          <!-- @tolgee-key override-1 -->
          <p t [key]="\`dynamic-key-\${i}\`" />
          <!-- @tolgee-key override-2 -->
          <p t key="key1" [ns]="\`dynamic-ns-\${i}\`" />
          <!-- @tolgee-key override-3 -->
          <p t key="key3" default="\`dynamic-\${i}\`" />
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual([]);
    });

    it('emits warning when invalid json5 is used', async () => {
      const expected = [
        { warning: 'W_MALFORMED_KEY_OVERRIDE', line: 3 },
        { warning: 'W_INVALID_KEY_OVERRIDE', line: 4 },
      ];

      const code = `
        <template>
          <!-- @tolgee-key { key: 'key2' -->
          <!-- @tolgee-key { ns: 'key2' } -->
        </template>
      `;

      const extracted = await extractNgxKeys(code, 'test.component.html');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });
  });
});
