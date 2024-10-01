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
      </div>
    `;

    const extracted = await extractNgxKeys(code, 'test.component.html');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 3 },
      { keyName: 'key2', line: 4 },
      { keyName: 'key3', line: 5 },
      { keyName: 'key4', line: 6 },
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

describe('translate service', () => {
  it('extracts from translateService', async () => {
    const code = `
      import { Component, OnInit } from '@angular/core';
      import { TranslateService } from '@tolgee/ngx';

      @Component({
        selector: 'app-root',
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.css'],
      })
      export class AppComponent implements OnInit {
        constructor(private translateService: TranslateService) {}
        async ngOnInit(): Promise<void> {
          this.translateService.translate('key1');
          this.translateService.instant('key2');
          this.translateService.get('key3');
        }
      }
    `;

    const extracted = await extractNgxKeys(code, 'test.ts');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 13 },
      { keyName: 'key2', line: 14 },
      { keyName: 'key3', line: 15 },
    ]);
  });

  it('ignores weird newlines', async () => {
    const code = `
      class AppComponent {
        constructor(private translateService: TranslateService) {}
        async ngOnInit(): Promise<void> {
          this
            
            .translateService
            
            .translate('key1');
        }
      }
    `;

    const extracted = await extractNgxKeys(code, 'test.ts');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 9 }]);
  });

  it('allows for `translationService`', async () => {
    const code = `
      class AppComponent {
        constructor(private translationService: TranslateService) {}
        async ngOnInit(): Promise<void> {
          this.translationService.translate('key1');
        }
      }
    `;

    const extracted = await extractNgxKeys(code, 'test.ts');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 5 }]);
  });

  it('extracts namespace and default value', async () => {
    const code = `
      class AppComponent {
        constructor(private translateService: TranslateService) {}
        async ngOnInit(): Promise<void> {
          this.translateService.translate('key1', 'default-1', { ns: 'ns-1' });
        }
      }
    `;

    const extracted = await extractNgxKeys(code, 'test.ts');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      {
        keyName: 'key1',
        defaultValue: 'default-1',
        namespace: 'ns-1',
        line: 5,
      },
    ]);
  });

  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 5 },
        { warning: 'W_DYNAMIC_KEY', line: 6 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
      ];

      const code = `
        class AppComponent {
          constructor(private translateService: TranslateService) {}
          async ngOnInit(): Promise<void> {
            this.translateService.translate(\`dynamic-key-\${i}\`);
            this.translateService.translate('dynamic-key-' + i);
            this.translateService.translate(key);
          }
        }
      `;

      const extracted = await extractNgxKeys(code, 'test.ts');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 5 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
      ];

      const code = `
        class AppComponent {
          constructor(private translateService: TranslateService) {}
          async ngOnInit(): Promise<void> {
            this.translateService.translate('key1', { ns: \`dynamic-ns-\${i}\` });
            this.translateService.translate('key2', { ns: 'dynamic-ns-' + i });
            this.translateService.translate('key3', { ns: namespace });
            this.translateService.translate('key4', { ns });
          }
        }
      `;

      const extracted = await extractNgxKeys(code, 'test.ts');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning for dynamic default values', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_OPTIONS', line: 5 },
        { warning: 'W_DYNAMIC_OPTIONS', line: 6 },
      ];

      const code = `
        class AppComponent {
          constructor(private translateService: TranslateService) {}
          async ngOnInit(): Promise<void> {
            this.translateService.translate('key1', 'dynamic-' + i);
            this.translateService.translate('key2', \`dynamic-\${i}\`);
          }
        }
      `;

      const extracted = await extractNgxKeys(code, 'test.ts');
      expect(extracted.warnings).toEqual(expectedWarnings);
    });
  });
});

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
