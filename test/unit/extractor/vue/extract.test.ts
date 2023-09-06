import extractKeys from '../../../../src/extractor/extractor.js';

describe('$t', () => {
  it('extracts use of $t in the template', async () => {
    const code = `
      <template>
        {{ $t('key1') }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts use of $t in v-bind args', async () => {
    const code = `
      <template>
        <p v-bind:title="$t('key1')">owo?</p>
        <p :title="$t('key2')">owo?</p>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 3 },
      { keyName: 'key2', line: 4 },
    ]);
  });

  it('does not extract use of $t in non v-bind args', async () => {
    const code = `
      <template>
        <p title="$t('key1')">owo?</p>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('extracts use of $t in event handlers', async () => {
    const code = `
      <template>
        <button @click="alert($t('key1'))">cwick mewn!!!</button>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts use of this.$t in scripts', async () => {
    const code = `
      <script>
        export default {
          methods: {
            onClick () {
              alert(this.$t('key1'))
            }
          }
        }
      </script>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 6 }]);
  });

  it('does not extract use of $t without this in scripts', async () => {
    const code = `
      <script>
        export default {
          methods: {
            onClick () {
              alert($t('key1'))
            }
          }
        }
      </script>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('extracts calls to $t(string, string)', async () => {
    const code = `
      <template>
        {{ $t('key1', 'default value') }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', defaultValue: 'default value', line: 3 },
    ]);
  });

  it('extracts calls to $t(string, string, opts)', async () => {
    const code = `
      <template>
        {{ $t('key1', 'default value', { ns: 'ns', defaultValue: 'ignored' }) }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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

  it('extracts calls to $t(string, opts)', async () => {
    const code = `
      <template>
        {{ $t('key1', { defaultValue: 'default value', ns: 'ns' }) }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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

  it('extracts calls to $t(opts)', async () => {
    const code = `
      <template>
        {{ $t({ key: 'key1', defaultValue: 'default value', ns: 'ns' }) }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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
      <template>
        {{ $t    (     'key1') }}
        {{
                  $t(
                    'key2')
                  }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 3 },
      { keyName: 'key2', line: 5 },
    ]);
  });

  it('is not confused by parameters', async () => {
    const code = `
      <template>
        {{ $t('key1', { params: { key: 'not_key1' } }) }}
        {{ $t({ key: 'key2', params: { key: 'not_key2' } }) }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 3 },
      { keyName: 'key2', line: 4 },
    ]);
  });

  describe('dynamic data', () => {
    it('emits a warning on dynamic key', async () => {
      const code = `
        <template>
          {{ $t(\`dynamic-key-\${i}\`) }}
          {{ $t('dynamic-key-' + i) }}
          {{ $t(key) }}
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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
          {{ $t('key1', { ns: \`dynamic-ns-\${i}\` }) }}
          {{ $t('key2', { ns: 'dynamic-ns-' + i }) }}
          {{ $t('key2', { ns: ns }) }}
          {{ $t('key2', { ns }) }}
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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
          {{ $t('key1', 'dynamic-' + i) }}
          {{ $t('key2', \`dynamic-\${i}\`) }}
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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
          {{ $t('key1', someValue) }}
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 6 }]);
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

    const extracted = await extractKeys(code, 'App.vue');
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

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('extracts calls to t in the setup script after useTranslate was used (script setup)', async () => {
    const code = `
      <script setup> // @tolgee/vue
        const { t } = useTranslate()
        alert(t.value('key1'))
        alert(t('key2'))
      </script>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 4 }]);
  });

  it('extracts calls to t in the setup script after useTranslate was used (script)', async () => {
    const code = `
      <script> // @tolgee/vue
        export default {
          setup () {
            const { t } = useTranslate()
            alert(t.value('key1'))
            alert(t('key2'))
            return { t }
          }
        }
      </script>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 6 }]);
  });

  it('does not extract calls to this.t or t in script', async () => {
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
              alert(this.t('key1'))
            }
          }
        }
      </script>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('does not extract calls to t if there was no useTranslate', async () => {
    const code = `
      <template> <!-- @tolgee/vue -->
        {{ t('key1') }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
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

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', namespace: 'ns1', line: 6 },
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

    const extracted = await extractKeys(code, 'App.vue');
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

    const extracted = await extractKeys(code, 'App.vue');
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

    const extracted = await extractKeys(code, 'App.vue');
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

    const extracted = await extractKeys(code, 'App.vue');
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
        {{ t('key1', { ns: 'ns1', defaultValue: 'default value' }) }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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
        {{ t({ keyName: 'key1', ns: 'ns1', defaultValue: 'default value' }) }}
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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

    const extracted = await extractKeys(code, 'useSomething.ts');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted1 = await extractKeys(code1, 'App.vue');
      const extracted2 = await extractKeys(code2, 'App.vue');
      const extracted3 = await extractKeys(code3, 'App.vue');

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
          {{ t('key1', 'dynamic-' + i) }}
          {{ t('key2', \`dynamic-\${i}\`) }}
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        { warning: 'W_VUE_SETUP_IS_A_REFERENCE', line: 4 },
      ]);
      expect(extracted.keys).toEqual([]);
    });
  });
});

describe('<T>', () => {
  it('extracts keys specified as properties', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <template> <!-- @tolgee/vue -->
        <T keyName='key1'/>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as v-bind properties', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <template> <!-- @tolgee/vue -->
        <T :keyName="'key1'"/>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the default value from props', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value1', line: 3 },
    ];

    const code = `
      <template> <!-- @tolgee/vue -->
        <T keyName='key1' defaultValue='default value1'/>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1', line: 3 }];

    const code = `
      <template> <!-- @tolgee/vue -->
        <T keyName='key1' ns='ns1'/>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract from unrelated components', async () => {
    const expected = [{ keyName: 'key1', line: 4 }];

    const code = `
      <template> <!-- @tolgee/vue -->
        <div keyName='not key1'>
          <T keyName='key1'/>
        </div>
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('is undisturbed by objects in properties', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'value', line: 3 }];

    const code = `
      <template> <!-- @tolgee/vue -->
        <T defaultValue='value' :properties="{ a: 'b' }" keyName='key1' />
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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
      <template> <!-- @tolgee/vue -->
        <T
          keyName='key1'
          ns='ns1'
          defaultValue='default value1'
        />
      </template>
    `;

    const extracted = await extractKeys(code, 'App.vue');
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
        <template> <!-- @tolgee/vue -->
          <T :keyName="\`dynamic-key-\${i}\`" />
          <T :keyName="'dynamic-key-' + i" />
          <T :keyName="key" />
          <T keyName />
          <T @keyName="eventHandler" />
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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
        <template> <!-- @tolgee/vue -->
          <T keyName='key1' :ns="\`dynamic-ns-\${i}\`" />
          <T keyName='key2' :ns="'dynamic-ns-' + i" />
          <T keyName='key2' :ns={ns} />
          <T keyName='key2' ns/>
          <T keyName='key2' @ns="ns"/>
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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
        <template> <!-- @tolgee/vue -->
          <T keyName='key1' :defaultValue="someValue"/>
          <T keyName='key2' :defaultValue="'dynamic-' + i"/>
          <T keyName='key3' :defaultValue="\`dynamic-\${i}\`"/>
          <T keyName='key4' @defaultValue="dv"/>
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});

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

      const extracted = await extractKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses warnings related to useTranslate's subsequent resolve failures", async () => {
      const code = `
        <script setup> // @tolgee/vue
          // @tolgee-ignore
          const { t } = useTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <template>
          {{ t('key1') }}
        </template>
      `;

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
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

      const extracted = await extractKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });
  });
});
