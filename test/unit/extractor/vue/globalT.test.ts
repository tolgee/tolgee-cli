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

describe('$t', () => {
  it('extracts use of $t in the template', async () => {
    const code = `
      <template>
        {{ $t('key1') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
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

    const extracted = await extractVueKeys(code, 'App.vue');
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

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('extracts use of $t in event handlers', async () => {
    const code = `
      <template>
        <button @click="alert($t('key1'))">cwick mewn!!!</button>
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([{ keyName: 'key1', line: 3 }]);
  });

  it('extracts both this.$t and $t but nothing else', async () => {
    const code = `
      <script>
        export default {
          methods: {
            onClick () {
              alert(this.$t('key1'))
              alert($t('key2'))
              alert(foo.$t('key3'))
            }
          }
        }
      </script>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([
      { keyName: 'key1', line: 6 },
      { keyName: 'key2', line: 7 },
    ]);
  });

  it('extracts calls to $t(string, string)', async () => {
    const code = `
      <template>
        {{ $t('key1', 'default value') }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
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

    const extracted = await extractVueKeys(code, 'App.vue');
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
        {{ $t('key1', 'default value', { ns: 'ns' }) }}
      </template>
    `;

    const extracted = await extractVueKeys(code, 'App.vue');
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

    const extracted = await extractVueKeys(code, 'App.vue');
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

    const extracted = await extractVueKeys(code, 'App.vue');
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

    const extracted = await extractVueKeys(code, 'App.vue');
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

      const extracted = await extractVueKeys(code, 'App.vue');
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

      const extracted = await extractVueKeys(code, 'App.vue');
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
          {{ $t('key1', 'dynamic-' + i, {}) }}
          {{ $t('key2', \`dynamic-\${i}\`, {}) }}
        </template>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
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

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.warnings).toEqual([
        {
          warning: 'W_DYNAMIC_OPTIONS',
          line: 3,
        },
      ]);
      expect(extracted.keys).toEqual([]);
    });
  });

  describe('global tolgee.t function', () => {
    it('detects global tolgee.t function', async () => {
      const code = `
        <script>
          const tolgee = Tolgee()
          tolgee.t('key_name')
        </script>
      `;

      const extracted = await extractVueKeys(code, 'App.vue');
      expect(extracted.keys).toEqual([{ keyName: 'key_name', line: 4 }]);
      expect(extracted.warnings).toEqual([]);
    });
  });
});
