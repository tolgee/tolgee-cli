import { extractTreeAndReport } from '#cli/extractor/extractor.js';
import { ExtractOptions } from '#cli/extractor/index.js';

const VERBOSE = false;

async function extractVueKeys(
  code: string,
  fileName: string,
  options?: Partial<ExtractOptions>
) {
  const { report } = await extractTreeAndReport(code, fileName, 'vue', {
    strictNamespace: true,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });
  return report;
}

describe('useTranslate', () => {
  it('extracts calls to t in the template', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        {{ t('key1') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 6 }]);
  });

  it('extracts calls to t in when script is under the template', async () => {
    const code = `
      <template>
        {{ t('key1') }}
      </template>
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts calls to t in v-bind attributes', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        <p :aria-label="t('key1')"/>
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 6 }]);
  });

  it('does not extract calls to t in non v-bind attributes', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        <p aria-label="t('key1')">owo</p>
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('extracts both t and t.value (script setup)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
        alert(t.value('key1'))
        alert(t('key2'))
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 4 },
      { keyName: 'key2', line: 5 },
    ]);
  });

  it('warning on t in script methods', async () => {
    const code = `
      <script> // @tolgee/vue
        export default {
          setup () {
            const { t } = useTranslate()
            return { t }
          },
          methods: {
            onClick () {
              alert(t('key1'))
            }
          }
        }
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([
      { line: 10, warning: 'W_MISSING_T_SOURCE' },
    ]);
    expect(extracted.keys).toEqual([]);
  });

  it('warning on calls to t if there was no useTranslate', async () => {
    const code = `
      <template> <!-- @tolgee/vue -->
        {{ t('key1') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([
      {
        line: 3,
        warning: 'W_MISSING_T_SOURCE',
      },
    ]);
    expect(extracted.keys).toEqual([]);
  });

  it('keeps track of the namespace specified in useTranslate', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate('ns1')
      </script>
      <template>
        {{ t('key1') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 6 },
    ]);
  });

  it('namespace specified in useTranslate in setup function', async () => {
    const code = `
      <script> // @tolgee/vue
        export default {
          setup () {
            const { t } = useTranslate('ns1')
            return { t }
          },
        }
      </script>
      <template>
        {{ t('key1') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 11 },
    ]);
  });

  it('namespace in setup function, template above script', async () => {
    const code = `
      <template>
        {{ t('key1') }}
      </template>
      <script> // @tolgee/vue
        export default {
          setup() {
            const { t } = useTranslate('ns1')
            return { t }
          },
        }
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 3 },
    ]);
  });

  it('namespace in setup arrow function', async () => {
    const code = `
      <template>
        {{ t('key1') }}
      </template>
      <script> // @tolgee/vue
        export default {
          setup: () => {
            const { t } = useTranslate('ns1')
            return { t }
          },
        }
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 3 },
    ]);
  });

  it('namespace in setup, regular function', async () => {
    const code = `
      <template>
        {{ t('key1') }}
      </template>
      <script> // @tolgee/vue
        export default {
          setup: function () {
            const { t } = useTranslate('ns1')
            return { t }
          },
        }
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 3 },
    ]);
  });

  it('keeps track of the namespace specified in useTranslate (array)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate([ 'ns1', 'ns2' ])
      </script>
      <template>
        {{ t('key1') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 6 },
    ]);
  });

  it('overrides the specified namespace if one is passed as parameter', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate('ns1')
      </script>
      <template>
        {{ t('key1', { ns: 'ns2' }) }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns2', line: 6 },
    ]);
  });

  it('extracts calls to t(string, string)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        {{ t('key1', 'default value') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', defaultValue: 'default value', line: 6 },
    ]);
  });

  it('extracts calls to t(string, string, opts)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        {{ t('key1', 'default value', { ns: 'ns1', defaultValue: 'ignored' }) }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      {
        keyName: 'key1',
        namespace: 'ns1',
        defaultValue: 'default value',
        line: 6,
      },
    ]);
  });

  it('extracts calls to t(string, opts)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        {{ t('key1', 'default value', { ns: 'ns1' }) }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      {
        keyName: 'key1',
        namespace: 'ns1',
        defaultValue: 'default value',
        line: 6,
      },
    ]);
  });

  it('extracts calls to t(opts)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
      </script>
      <template>
        {{ t({ key: 'key1', ns: 'ns1', defaultValue: 'default value' }) }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      {
        keyName: 'key1',
        namespace: 'ns1',
        defaultValue: 'default value',
        line: 6,
      },
    ]);
  });

  it('extracts calls to t in non-SFC files', async () => {
    const code = `
      import { useTranslate } from '@tolgee/vue'

      export default function useSomething () {
        const { t } = useTranslate()

        return [
          t.value('key1'),
        ]
      }
    `;

    const extracted = await extractVueKeys(code, 'useSomething.ts');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 8 }]);
  });

  describe('dynamic data', () => {
    it('emits a warning on dynamic key', async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          {{ t(\`dynamic-key-\${i}\`) }}
          {{ t('dynamic-key-' + i) }}
          {{ t(key) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_KEY', line: 6 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
        { warning: 'W_DYNAMIC_KEY', line: 8 },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits a warning on dynamic namespace (t)', async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          {{ t('key1', { ns: \`dynamic-ns-\${i}\` }) }}
          {{ t('key2', { ns: 'dynamic-ns-' + i }) }}
          {{ t('key2', { ns: ns }) }}
          {{ t('key2', { ns }) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 9 },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits a warning on dynamic namespace (useTranslate)', async () => {
      const code1 = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <template>
          {{ t('key1') }}
        </template>
      `;
      const code2 = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate('dynamic-ns-' + i)
        </script>
        <template>
          {{ t('key1') }}
        </template>
      `;
      const code3 = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate(ns)
        </script>
        <template>
          {{ t('key1') }}
        </template>
      `;

      const extracted1 = await extractVueKeys(code1, 'App.vue');
      const extracted2 = await extractVueKeys(code2, 'App.vue');
      const extracted3 = await extractVueKeys(code3, 'App.vue');

      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 6 },
      ];
      expect(extracted1.warnings).toEqual(expected);
      expect(extracted2.warnings).toEqual(expected);
      expect(extracted3.warnings).toEqual(expected);
      expect(extracted1.keys).toEqual([]);
      expect(extracted2.keys).toEqual([]);
      expect(extracted3.keys).toEqual([]);
    });

    it('emits a warning on dynamic default value but keeps the key', async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          {{ t('key1', 'dynamic-' + i, {}) }}
          {{ t('key2', \`dynamic-\${i}\`, {}) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 7 },
      ]);
      expect(extracted.keys).toEqual([
        { keyName: 'key1', defaultValue: undefined, line: 6 },
        { keyName: 'key2', defaultValue: undefined, line: 7 },
      ]);
    });

    it('emits a warning on dynamic options', async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          {{ t('key1', someValue) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        {
          warning: 'W_DYNAMIC_OPTIONS',
          line: 6,
        },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('extracts normally if useTranslate is dynamic but a static override is specified', async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate(ns)
        </script>
        <template>
          {{ t('key1') }}
          {{ t('key2', { ns: 'static-ns' }) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        { warning: 'W_DYNAMIC_NAMESPACE', line: 3 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 6 },
      ]);
      expect(extracted.keys).toEqual([
        { keyName: 'key2', namespace: 'static-ns', line: 7 },
      ]);
    });

    it('emits warning if options-style setup is not a direct function', async () => {
      const code = `
        <script> // @tolgee/vue
          export default {
            setup: mySetup
          }
        </script>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        { warning: 'W_VUE_SETUP_IS_A_REFERENCE', line: 4 },
      ]);
      expect(extracted.keys).toEqual([]);
    });
  });
});
