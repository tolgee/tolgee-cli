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

describe('magic comments', () => {
  describe('@tolgee-ignore', () => {
    it('ignores useTranslate', async () => {
      const code = `
        <script setup> // @tolgee/vue
          // @tolgee-ignore
          const { t } = useTranslate()
        </script>
        <template>
          {{ t('not_a_key') }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        {
          line: 7,
          warning: 'W_MISSING_T_SOURCE',
        },
      ]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores t', async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          <!-- @tolgee-ignore -->
          {{ t('not_a_key') }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores <T>', async () => {
      const code = `
        <template> <!-- @tolgee/vue -->
          <!-- @tolgee-ignore -->
          <T keyName='hello-world' />
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning upon unused marker', async () => {
      const expected = [
        { warning: 'W_UNUSED_IGNORE', line: 3 },
        { warning: 'W_UNUSED_IGNORE', line: 7 },
      ];

      const code = `
        <script setup> // @tolgee/vue
          // @tolgee-ignore
          console.log('hi cutie')
        </script>
        <template>
          <!-- @tolgee-ignore -->
          <div>uwu</div>
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses direct t calls' warnings", async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          <!-- @tolgee-ignore -->
          {{ t(\`dynamic-key-\${i}\`) }}
          <!-- @tolgee-ignore -->
          {{ t('key1', { ns: \`dynamic-ns-\${i}\` }) }}
          <!-- @tolgee-ignore -->
          {{ t('key2', \`dynamic-\${i}\`) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses warnings of ignored useTranslate's t", async () => {
      const code = `
        <script setup> // @tolgee/vue
          // @tolgee-ignore
          const { t } = useTranslate()
        </script>
        {{ t(\`dynamic-key-\${i}\`) }}
        {{ t('key1', { ns: \`dynamic-ns-\${i}\` }) }}
        {{ t('key2', \`dynamic-\${i}\`) }}
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('only suppresses $t resolve failure', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 3 }];

      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <template>
          <!-- @tolgee-ignore -->
          {{ t('key1') }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses warnings of <T>', async () => {
      const code = `
        <template> <!-- @tolgee/vue -->
          <!-- @tolgee-ignore -->
          <T :keyName="\`dynamic-key-\${i}\`" />
          <!-- @tolgee-ignore -->
          <T keyName='key1' :ns="\`dynamic-ns-\${i}\`" />
          <!-- @tolgee-ignore -->
          <T keyName='key3' :defaultValue="\`dynamic-\${i}\`"/>
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });
  });

  describe('@tolgee-key', () => {
    it('extracts keys specified as comments', async () => {
      const expected = [
        { keyName: 'key1', line: 3 },
        {
          keyName: 'key2',
          namespace: 'ns',
          defaultValue: 'test value',
          line: 4,
        },
        { keyName: 'key3', line: 7 },
      ];

      const code = `
        <script setup> // @tolgee/vue
          // @tolgee-key key1
          // @tolgee-key { key: 'key2', ns: 'ns', defaultValue: 'test value' }
        </script>
        <template>
          <!-- @tolgee-key key3 -->
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.keys).toEqual(expected);
    });

    it('overrides data from code', async () => {
      const expected = [
        { keyName: 'key-override-1', line: 6 },
        { keyName: 'key-override-2', namespace: undefined, line: 8 },
      ];

      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate('namespace')
        </script>
        <template>
          <!-- @tolgee-key key-override-1 -->
          <T keyName='key-props-1' />
          <!-- @tolgee-key key-override-2 -->
          {{ t('key-props-2') }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("doesn't extract json5 if escaped", async () => {
      const expected = [{ keyName: '{key}', line: 3 }];

      const code = `
        <template> <!-- @tolgee/vue -->
          <!-- @tolgee-key \\{key} -->
          <T keyName='key-props-1' />
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("suppresses $t calls' warnings", async () => {
      const code = `
        <template> <!-- @tolgee/vue -->
          <!-- @tolgee-key override-1 -->
          {{ $t(\`dynamic-key-\${i}\`) }}
          <!-- @tolgee-key override-2 -->
          {{ $t('key1', { ns: \`dynamic-ns-\${i}\` }) }}
          <!-- @tolgee-key override-3 -->
          {{ $t('key2', \`dynamic-\${i}\`) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
    });

    it("suppresses direct t calls' warnings", async () => {
      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate()
        </script>
        <template>
          <!-- @tolgee-key override-1 -->
          {{ t(\`dynamic-key-\${i}\`) }}
          <!-- @tolgee-key override-2 -->
          {{ t('key1', { ns: \`dynamic-ns-\${i}\` }) }}
          <!-- @tolgee-key override-3 -->
          {{ t('key2', \`dynamic-\${i}\`) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
    });

    it('only suppresses t resolve failure', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 3 }];

      const code = `
        <script setup> // @tolgee/vue
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <template>
          <!-- @tolgee-key override-1 -->
          {{ t('key1') }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual(expected);
    });

    it('suppresses warnings of <T>', async () => {
      const code = `
        <template> <!-- @tolgee/vue -->
          <!-- @tolgee-key override-1 -->
          <T keyName={\`dynamic-key-\${i}\`} />
          <!-- @tolgee-key override-2 -->
          <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
          <!-- @tolgee-key override-3 -->
          <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
    });

    it('emits warning when invalid json5 is used', async () => {
      const expected = [
        { warning: 'W_MALFORMED_KEY_OVERRIDE', line: 3 },
        { warning: 'W_INVALID_KEY_OVERRIDE', line: 4 },
      ];

      const code = `
        <script setup> // @tolgee/vue
          // @tolgee-key { key: 'key2'
          // @tolgee-key { ns: 'key2' }
        </script>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });
  });
});
