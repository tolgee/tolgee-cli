import extractKeys from '../../../src/extractor/extractor.js';

describe('getTranslate', () => {
  it('extracts from the t call with signature t(string))', async () => {
    const expected = [{ keyName: 'key1', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1')}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string)', async () => {
    const expected = [
      { keyName: 'key1', defaultValue: 'default value', line: 6 },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1', 'default value')}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, string, opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 6,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1', 'default value', { ns: 'ns', defaultValue: 'ignored' })}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(string, opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 6,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t('key1', { defaultValue: 'default value', ns: 'ns' })}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts from the t call with signature t(opts)', async () => {
    const expected = [
      {
        keyName: 'key1',
        defaultValue: 'default value',
        namespace: 'ns',
        line: 6,
      },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate()
      </script>
      {$t({ key: 'key1', defaultValue: 'default value', ns: 'ns' })}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in getTranslate', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate('namespace')
      </script>
      {$t('key1')}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('keeps track of the namespace specified in getTranslate (array)', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace1', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate([ 'namespace1', 'namespace2' ])
      </script>
      {$t('key1')}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('overrides the specified namespace if one is passed as parameter', async () => {
    const expected = [
      { keyName: 'key1', namespace: 'ns1', line: 6 },
      { keyName: 'key2', namespace: undefined, line: 7 },
    ];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate('namespace')
      </script>
      {$t('key1', { ns: 'ns1' })}
      {$t('key2', { ns: '' })}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('does not extract if there was no getTranslate call', async () => {
    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        // Do something...
      </script>
      {$t('key1')}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual([]);
  });

  it('handles multi-line use', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 9 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate(
          'namespace'
        )
      </script>
      {
        $t(
          'key1'
        )
      }
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('handles weird spacings', async () => {
    const expected = [{ keyName: 'key1', namespace: 'namespace', line: 6 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <script>
        const { t } = getTranslate         (   'namespace')
      </script>
      {$t     (      'key1')}
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  describe('dynamic data', () => {
    it('emits warning on dynamic keys and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_KEY', line: 6 },
        { warning: 'W_DYNAMIC_KEY', line: 7 },
        { warning: 'W_DYNAMIC_KEY', line: 8 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('namespace')
        </script>
        {$t(\`dynamic-key-\${i}\`)}
        {$t('dynamic-key-' + i)}
        {$t(key)}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning on dynamic namespace (within t) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 6 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 7 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 8 },
        { warning: 'W_DYNAMIC_NAMESPACE', line: 9 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('namespace')
        </script>
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        {$t('key2', { ns: 'dynamic-ns-' + i })}
        {$t('key2', { ns: ns })}
        {$t('key2', { ns })}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warnings on dynamic namespace (within getTranslate) and skips', async () => {
      const expected = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 6 },
      ];

      const templateCode = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        {$t('key1')}
      `;
      const concatCode = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('dynamic-ns-' + i)
        </script>
        {$t('key1')}
      `;
      const variableCode = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(ns)
        </script>
        {$t('key1')}
      `;

      const extracted1 = await extractKeys(templateCode, 'App.svelte');
      const extracted2 = await extractKeys(concatCode, 'App.svelte');
      const extracted3 = await extractKeys(variableCode, 'App.svelte');
      expect(extracted1.warnings).toEqual(expected);
      expect(extracted1.keys).toEqual([]);
      expect(extracted2.warnings).toEqual(expected);
      expect(extracted2.keys).toEqual([]);
      expect(extracted3.warnings).toEqual(expected);
      expect(extracted3.keys).toEqual([]);
    });

    it('extracts if getTranslate is dynamic but a static override is specified', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_NAMESPACE', line: 4 },
        { warning: 'W_UNRESOLVABLE_NAMESPACE', line: 6 },
      ];

      const expectedKeys = [
        { keyName: 'key2', namespace: 'static-ns', line: 7 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(ns)
        </script>
        {$t('key1')}
        {$t('key2', { ns: 'static-ns' })}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });

    it('emits warning for dynamic parameters', async () => {
      const expectedWarnings = [{ warning: 'W_DYNAMIC_OPTIONS', line: 6 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        {$t('key1', someValue)}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning for dynamic default values, but extracts keys', async () => {
      const expectedWarnings = [
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 6 },
        { warning: 'W_DYNAMIC_DEFAULT_VALUE', line: 7 },
      ];

      const expectedKeys = [
        { keyName: 'key1', defaultValue: undefined, line: 6 },
        { keyName: 'key2', defaultValue: undefined, line: 7 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        {$t('key1', 'dynamic-' + i)}
        {$t('key2', \`dynamic-\${i}\`)}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});

describe('<T>', () => {
  it('extracts keys specified as properties', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName='key1'/>
    `;

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts keys specified as properties with curly braces', async () => {
    const expected = [{ keyName: 'key1', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName={'key1'}/>
    `;

    const extracted = await extractKeys(code, 'App.svelte');
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

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('extracts the namespace from props', async () => {
    const expected = [{ keyName: 'key1', namespace: 'ns1', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T keyName='key1' ns='ns1'/>
    `;

    const extracted = await extractKeys(code, 'App.svelte');
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

    const extracted = await extractKeys(code, 'App.svelte');
    expect(extracted.warnings).toEqual([]);
    expect(extracted.keys).toEqual(expected);
  });

  it('is undisturbed by objects in properties', async () => {
    const expected = [{ keyName: 'key1', defaultValue: 'value', line: 3 }];

    const code = `
      <script>import '@tolgee/svelte';</script>
      <T defaultValue='value' properties={{ a: 'b' }} keyName='key1' />
    `;

    const extracted = await extractKeys(code, 'App.svelte');
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

    const extracted = await extractKeys(code, 'App.svelte');
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

      const extracted = await extractKeys(code, 'App.svelte');
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

      const extracted = await extractKeys(code, 'App.svelte');
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

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expectedWarnings);
      expect(extracted.keys).toEqual(expectedKeys);
    });
  });
});

describe('magic comments', () => {
  describe('@tolgee-ignore', () => {
    it('ignores getTranslate', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-ignore
          const { t } = getTranslate()
        </script>
        {$t('uwu')}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores t', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        <!-- @tolgee-ignore -->
        {$t('uwu')}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('ignores <T>', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-ignore -->
        <T keyName='hello-world' />
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('emits warning upon unused marker', async () => {
      const expected = [
        { warning: 'W_UNUSED_IGNORE', line: 4 },
        { warning: 'W_UNUSED_IGNORE', line: 7 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-ignore
          console.log('hi cutie')
        </script>
        <!-- @tolgee-ignore -->
        <div>uwu</div>
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses direct $t calls' warnings", async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        <!-- @tolgee-ignore -->
        {$t(\`dynamic-key-\${i}\`)}
        <!-- @tolgee-ignore -->
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        <!-- @tolgee-ignore -->
        {$t('key2', \`dynamic-\${i}\`)}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses warnings of ignored getTranslate's $t", async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-ignore
          const { t } = getTranslate()
        </script>
        {$t(\`dynamic-key-\${i}\`)}
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        {$t('key2', \`dynamic-\${i}\`)}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it("suppresses warnings related to getTranslate's subsequent resolve failures", async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-ignore
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        {$t('key1')}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });

    it('only suppresses $t resolve failure', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 4 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <!-- @tolgee-ignore -->
        {$t('key1')}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });

    it('suppresses warnings of <T>', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-ignore -->
        <T keyName={\`dynamic-key-\${i}\`} />
        <!-- @tolgee-ignore -->
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <!-- @tolgee-ignore -->
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
      expect(extracted.keys).toEqual([]);
    });
  });

  describe('@tolgee-key', () => {
    it('extracts keys specified as comments', async () => {
      const expected = [
        { keyName: 'key1', line: 4 },
        {
          keyName: 'key2',
          namespace: 'ns',
          defaultValue: 'test value',
          line: 5,
        },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-key key1
          // @tolgee-key { key: 'key2', ns: 'ns', defaultValue: 'test value' }
        </script>
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual(expected);
    });

    it('overrides data from code', async () => {
      const expected = [
        { keyName: 'key-override-1', line: 6 },
        { keyName: 'key-override-2', namespace: undefined, line: 8 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate('namespace')
        </script>
        <!-- @tolgee-key key-override-1 -->
        <T keyName='key-props-1' />
        <!-- @tolgee-key key-override-2 -->
        {$t('key-props-2')}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("doesn't extract json5 if escaped", async () => {
      const expected = [{ keyName: '{key}', line: 3 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-key \\{key} -->
        <T keyName='key-props-1' />
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.keys).toEqual(expected);
      expect(extracted.warnings).toEqual([]);
    });

    it("suppresses direct $t calls' warnings", async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate()
        </script>
        <!-- @tolgee-key override-1 -->
        {$t(\`dynamic-key-\${i}\`)}
        <!-- @tolgee-key override-2 -->
        {$t('key1', { ns: \`dynamic-ns-\${i}\` })}
        <!-- @tolgee-key override-3 -->
        {$t('key2', \`dynamic-\${i}\`)}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
    });

    it('only suppresses $t resolve failure', async () => {
      const expected = [{ warning: 'W_DYNAMIC_NAMESPACE', line: 4 }];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          const { t } = getTranslate(\`dynamic-ns-\${i}\`)
        </script>
        <!-- @tolgee-key override-1 -->
        {$t('key1')}
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
    });

    it('suppresses warnings of <T>', async () => {
      const code = `
        <script>import '@tolgee/svelte';</script>
        <!-- @tolgee-key override-1 -->
        <T keyName={\`dynamic-key-\${i}\`} />
        <!-- @tolgee-key override-2 -->
        <T keyName='key1' ns={\`dynamic-ns-\${i}\`} />
        <!-- @tolgee-key override-3 -->
        <T keyName='key3' defaultValue={\`dynamic-\${i}\`}/>
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual([]);
    });

    it('emits warning when invalid json5 is used', async () => {
      const expected = [
        { warning: 'W_MALFORMED_KEY_OVERRIDE', line: 4 },
        { warning: 'W_INVALID_KEY_OVERRIDE', line: 5 },
      ];

      const code = `
        <script>import '@tolgee/svelte';</script>
        <script>
          // @tolgee-key { key: 'key2'
          // @tolgee-key { ns: 'key2' }
        </script>
      `;

      const extracted = await extractKeys(code, 'App.svelte');
      expect(extracted.warnings).toEqual(expected);
      expect(extracted.keys).toEqual([]);
    });
  });
});
