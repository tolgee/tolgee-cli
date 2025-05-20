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

  describe('global tolgee.t function', () => {
    it('detects global tolgee.t function', async () => {
      const code = `
        const tolgee = Tolgee()
        tolgee.t('key_name')
      `;

      const extracted = await extractNgxKeys(code, 'test.ts');
      expect(extracted.keys).toEqual([{ keyName: 'key_name', line: 3 }]);
      expect(extracted.warnings).toEqual([]);
    });
  });
});
