import { extractTreeAndReport } from '../../../../extractor/extractor.js';
import { ExtractOptions, ParserType } from '../../../../extractor/index.js';
import { DictNode, KeyInfoNode } from '../../../../extractor/parser/types.js';
import { extractValue } from '../../../../extractor/parser/nodeUtils.js';

const VERBOSE = false;

async function getNodes(
  input: string,
  fileName: string,
  parserType: ParserType,
  options?: Partial<ExtractOptions>
) {
  const { tree } = await extractTreeAndReport(input, fileName, parserType, {
    strictNamespace: false,
    defaultNamespace: undefined,
    verbose: VERBOSE ? ['extractor'] : undefined,
    ...options,
  });

  if (tree.type === 'expr') {
    return tree.values;
  } else {
    throw Error("First node is not 'expr'");
  }
}

async function getObject(
  input: string,
  fileName: string,
  parserType: ParserType,
  options?: Partial<ExtractOptions>
) {
  const nodes = await getNodes(input, fileName, parserType, options);
  return nodes.find((n) => n.type === 'dict') as DictNode;
}

async function getKeyInfo(
  input: string,
  fileName: string,
  parserType: ParserType,
  options?: Partial<ExtractOptions>
) {
  const nodes = await getNodes(input, fileName, parserType, options);
  return nodes.find((n) => n.type === 'keyInfo') as KeyInfoNode;
}

describe('Plain JavaScript', () => {
  describe.each(['js', 'ts', 'jsx', 'tsx'])('JavaScript (.%s)', (ext) => {
    const FILE_NAME = `test.${ext}`;

    it('extracts information from basic objects', async () => {
      const dict = await getObject(
        'const a = { key: "key1", defaultValue: \'default value\', ns: `ns1`, test: 22 }',
        FILE_NAME,
        'react'
      );

      expect(extractValue(dict.value['key'])).toBe('key1');
      expect(extractValue(dict.value['defaultValue'])).toBe('default value');
      expect(extractValue(dict.value['ns'])).toBe('ns1');
    });

    it('correctly extracts info when nested', async () => {
      const dict = await getObject(
        'const a = { key: "key1", test: { key: "not key1", defaultValue: "def value1" }, defaultValue: "def" }',
        FILE_NAME,
        'react'
      );

      expect(extractValue(dict.value.key)).toBe('key1');
      expect(extractValue(dict.value.defaultValue)).toBe('def');
    });

    it('extracts static keys written as an expression', async () => {
      const dict = await getObject(
        'const a = { ["key"]: "key1", [`defaultValue`]: "def value1" }',
        FILE_NAME,
        'react'
      );

      expect(extractValue(dict.value.key)).toBe('key1');
      expect(extractValue(dict.value.defaultValue)).toBe('def value1');
    });

    describe('dynamic data', () => {
      it('marks templates with ${} chunks as dynamic', async () => {
        const dict = await getObject(
          'const a = { key: `dynamic-${i}`, test: "something" }',
          FILE_NAME,
          'react'
        );

        expect(dict.value.key?.type).toBe('expr');
        expect(extractValue(dict.value.test)).toBe('something');
        expect(dict.value.namespace).toBeUndefined();
        expect(dict.value.defaultValue).toBeUndefined();
      });

      it('marks strings with concatenations as dynamic', async () => {
        const dict = await getObject(
          'const a = { key: "dynamic-" + i, test: "something" }',
          FILE_NAME,
          'react'
        );

        expect(dict.value.key?.type).toBe('expr');
        expect(dict.value.test?.type).toBe('primitive');
      });

      it('marks plain variables as dynamic', async () => {
        const dict = await getObject(
          'const a = { key: key, test: "something" }',
          FILE_NAME,
          'react'
        );

        expect(dict.value.key?.type).toBe('expr');
      });

      it('marks declaration shorthand as dynamic', async () => {
        const dict = await getObject(
          'const a = { key, v: keyName, test: "something", ns }',
          FILE_NAME,
          'react'
        );

        expect(dict.value.key?.type).toBe('expr');
      });

      it('handles empty strings (ref: #29)', async () => {
        const dict = await getObject(
          'const a = { key: "key", ns: "" }',
          FILE_NAME,
          'react'
        );

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.ns)).toBe('');
      });

      it('handles strings with newlines', async () => {
        const dict = await getObject(
          "const a = { key: 'key', defaultValue: 'default\\nvalue' }",
          FILE_NAME,
          'react'
        );

        JSON.stringify(dict.value.defaultValue);

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.defaultValue)).toBe('default\nvalue');
      });

      it('handles strings with newlines in template strings', async () => {
        const dict = await getObject(
          "const a = { key: 'key', defaultValue: `default\\nvalue` }",
          FILE_NAME,
          'react'
        );

        JSON.stringify(dict.value.defaultValue);

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.defaultValue)).toBe('default\nvalue');
      });

      it('handles strings with escaped backslash', async () => {
        const dict = await getObject(
          "const a = { key: 'key', defaultValue: `default\\\\value` }",
          FILE_NAME,
          'react'
        );

        JSON.stringify(dict.value.defaultValue);

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.defaultValue)).toBe('default\\value');
      });

      it('handles strings with escaped tab', async () => {
        const dict = await getObject(
          "const a = { key: 'key', defaultValue: `default\\tvalue` }",
          FILE_NAME,
          'react'
        );

        JSON.stringify(dict.value.defaultValue);

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.defaultValue)).toBe('default\tvalue');
      });

      it('handles strings with escaped quotes', async () => {
        const dict = await getObject(
          "const a = { key: 'key', defaultValue: `default\\'value` }",
          FILE_NAME,
          'react'
        );

        JSON.stringify(dict.value.defaultValue);

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.defaultValue)).toBe("default'value");
      });

      it('handles strings with escaped double quotes', async () => {
        const dict = await getObject(
          "const a = { key: 'key', defaultValue: `default\\\"value` }",
          FILE_NAME,
          'react'
        );

        JSON.stringify(dict.value.defaultValue);

        expect(extractValue(dict.value.key)).toBe('key');
        expect(extractValue(dict.value.defaultValue)).toBe('default"value');
      });
    });
  });
});

describe.each(['ts', 'tsx'])('TypeScript (.%s)', (ext) => {
  const FILE_NAME = `test.${ext}`;
  it('gracefully ignores "as" cast', async () => {
    const dict = await getObject(
      'const a = { key: "key1" as any, test: 22 }',
      FILE_NAME,
      'react'
    );

    expect(extractValue(dict.value.key)).toBe('key1');
  });

  it('gracefully ignores "as" cast in complex keys', async () => {
    const dict = await getObject(
      'const a = { ["key" as SomeEnum]: "key1", test: 22 }',
      FILE_NAME,
      'react'
    );

    expect(extractValue(dict.value.key)).toBe('key1');
  });

  if (ext === 'ts') {
    // Test does not apply to TSX; <xxx> is interpreted as a component
    it('gracefully ignores prefix cast', async () => {
      const dict = await getObject(
        'const a = { key: <any> "key1", test: 22 }',
        FILE_NAME,
        'react'
      );

      expect(extractValue(dict.value.key)).toBe('key1');
    });
  }
});

describe('JSX', () => {
  describe.each(['jsx', 'tsx'])('Plain JSX (.%s)', (ext) => {
    const FILE_NAME = `test.${ext}`;

    it('extracts from plain JavaScript objects', async () => {
      const dict = await getObject(
        'const a = { key: "key1", test: 22 }',
        FILE_NAME,
        'react'
      );

      expect(extractValue(dict.value.key)).toBe('key1');
    });

    it('extracts simple JSX props', async () => {
      const info = await getKeyInfo('<T keyName="key1"/>', FILE_NAME, 'react');

      expect(extractValue(info.keyName)).toBe('key1');
    });

    it('extracts JSX props written as dynamic', async () => {
      const info = await getKeyInfo(
        '<T keyName={"key1"}/>',
        FILE_NAME,
        'react'
      );

      expect(extractValue(info.keyName)).toBe('key1');
    });

    it('is undisturbed by objects within properties', async () => {
      const info = await getKeyInfo(
        '<T properties={{ a: "b" }} keyName={"key1"}/>',
        FILE_NAME,
        'react'
      );

      expect(extractValue(info.keyName)).toBe('key1');
    });

    it('reaches completion if there are no properties', async () => {
      const info = await getKeyInfo('<T></T>', FILE_NAME, 'react');

      expect(extractValue(info?.keyName)).toBeUndefined();
    });

    it('reaches completion if there are no props (shorthand)', async () => {
      const info = await getKeyInfo('<T/>', FILE_NAME, 'react');
      expect(extractValue(info?.keyName)).toBeUndefined();
    });

    it('extracts all the properties when encountering embedded JSX', async () => {
      const info = await getKeyInfo(
        '<T keyName="owo" props={{ b: <b>{b}</b> }} ns="uwu" />',
        'App.jsx',
        'react'
      );

      expect(extractValue(info.keyName)).toBe('owo');
      expect(extractValue(info.namespace)).toBe('uwu');
    });

    describe('dynamic data', () => {
      it('marks templates with ${} chunks as dynamic', async () => {
        const info = await getKeyInfo(
          '<T keyName={`dynamic-${i}`}/>',
          FILE_NAME,
          'react'
        );

        expect(info.keyName?.type).toBe('expr');
      });

      it('marks strings with concatenations as dynamic', async () => {
        const info = await getKeyInfo(
          '<T ns="heh" keyName={"dynamic-" + i}/>',
          FILE_NAME,
          'react'
        );

        expect(extractValue(info.namespace)).toBe('heh');
        expect(info.keyName?.type).toBe('expr');
      });

      it('marks plain variables as dynamic', async () => {
        const info = await getKeyInfo('<T keyName={key}/>', FILE_NAME, 'react');

        expect(info.keyName?.type).toBe('expr');
      });

      it('marks declaration shorthand as dynamic', async () => {
        const info = await getKeyInfo(
          '<T keyName someValue={"key1"} ns/>',
          FILE_NAME,
          'react'
        );

        expect(extractValue(info.keyName)).toBe(true);
      });

      it('handles empty strings (ref: #29)', async () => {
        const info = await getKeyInfo(
          '<T keyName ns="" />',
          FILE_NAME,
          'react'
        );

        expect(extractValue(info.keyName)).toBe(true);
        expect(extractValue(info.namespace)).toBe('');
      });
    });
  });
});

describe('Svelte', () => {
  it('extracts simple HTML props', async () => {
    const info = await getKeyInfo(
      '<T keyName="key1"/>',
      'App.svelte',
      'svelte'
    );

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('extracts simple unquoted HTML props', async () => {
    const info = await getKeyInfo('<T keyName=key1/>', 'App.svelte', 'svelte');

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('extracts HTML props written as static JS expressions', async () => {
    const info = await getKeyInfo(
      '<T keyName={"key1"}/>',
      'App.svelte',
      'svelte'
    );

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('is undisturbed by objects within properties', async () => {
    const info = await getKeyInfo(
      '<T properties={{ a: "b" }} keyName={"key1"}/>',
      'App.svelte',
      'svelte'
    );

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('reaches completion if there are no properties', async () => {
    const info = await getKeyInfo('<T></T>', 'App.svelte', 'svelte');

    expect(extractValue(info?.keyName)).toBe(undefined);
  });

  it('reaches completion if there are no props (shorthand)', async () => {
    const info = await getKeyInfo('<T/>', 'App.svelte', 'svelte');

    expect(extractValue(info?.keyName)).toBe(undefined);
  });

  describe('dynamic data', () => {
    it('marks templates with ${} chunks as dynamic', async () => {
      const info = await getKeyInfo(
        '<T keyName={`dynamic-${i}`}/>',
        'App.svelte',
        'svelte'
      );

      expect(info?.keyName?.type).toBe('expr');
    });

    it('marks HTML properties with inline expressions as dynamic', async () => {
      const info = await getKeyInfo(
        '<T keyName="dynamic-{i}"/>',
        'App.svelte',
        'svelte'
      );
      expect(info?.keyName?.type).toBe('expr');
    });

    it('marks strings with concatenations as dynamic', async () => {
      const info = await getKeyInfo(
        '<T ns="heh" keyName={"dynamic-" + i}/>',
        'App.svelte',
        'svelte'
      );

      expect(info.keyName?.type).toBe('expr');
      expect(extractValue(info.namespace)).toBe('heh');
    });

    it('marks plain variables as dynamic', async () => {
      const info = await getKeyInfo(
        '<T keyName={key}/>',
        'App.svelte',
        'svelte'
      );

      expect(info.keyName?.type).toBe('expr');
    });

    it('marks declaration shorthand as dynamic', async () => {
      const info = await getKeyInfo(
        '<T keyName someValue={"key1"} ns/>',
        'App.svelte',
        'svelte'
      );

      expect(extractValue(info.keyName)).toBe(true);
    });

    it('handles empty strings (ref: #29)', async () => {
      const info = await getKeyInfo(
        '<T keyName ns="" />',
        'App.svelte',
        'svelte'
      );

      expect(extractValue(info.namespace)).toBe('');
    });
  });
});

describe('Vue', () => {
  const FILE_NAME = 'test.vue';
  it('extracts simple HTML props', async () => {
    const info = await getKeyInfo('<T keyName="key1"/>', FILE_NAME, 'vue');

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('extracts simple unquoted HTML props', async () => {
    const tokens = await getKeyInfo('<T keyName=key1/>', FILE_NAME, 'vue');

    expect(extractValue(tokens.keyName)).toBe('key1');
  });

  it('extracts HTML props written as static v-bind expressions', async () => {
    const info = await getKeyInfo(
      '<T v-bind:keyName="`key1`"/>',
      FILE_NAME,
      'vue'
    );

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('extracts HTML props written as static v-bind (shorthand) expressions', async () => {
    const info = await getKeyInfo('<T :keyName="\'key1\'"/>', FILE_NAME, 'vue');

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('is undisturbed by objects within properties', async () => {
    const info = await getKeyInfo(
      '<T :properties="{ a: "b" }" keyName="key1"/>',
      FILE_NAME,
      'vue'
    );

    expect(extractValue(info.keyName)).toBe('key1');
  });

  it('reaches completion if there are no properties', async () => {
    const info = await getKeyInfo('<T></T>', FILE_NAME, 'vue');

    expect(extractValue(info?.keyName)).toBe(undefined);
  });

  it('reaches completion if there are no props (shorthand)', async () => {
    const info = await getKeyInfo('<T/>', FILE_NAME, 'vue');

    expect(extractValue(info?.keyName)).toBe(undefined);
  });

  describe('dynamic data', () => {
    it('marks templates with ${} chunks as dynamic', async () => {
      const tokens = await getKeyInfo(
        '<T :keyName="`dynamic-${i}`"/>',
        FILE_NAME,
        'vue'
      );

      expect(tokens.keyName?.type).toBe('expr');
    });

    it('marks strings with concatenations as dynamic', async () => {
      const info = await getKeyInfo(
        '<T ns="heh" :keyName="\'dynamic-\' + i"/>',
        FILE_NAME,
        'vue'
      );

      expect(info.keyName?.type).toBe('expr');
    });

    it('marks plain variables as dynamic', async () => {
      const info = await getKeyInfo('<T :keyName="key"/>', FILE_NAME, 'vue');

      expect(info.keyName?.type).toBe('expr');
    });

    it('marks declaration shorthand as dynamic', async () => {
      const info = await getKeyInfo(
        '<T keyName someValue="key1" ns/>',
        FILE_NAME,
        'vue'
      );

      expect(extractValue(info.keyName)).toBe(true);
    });

    it('considers event handler syntax dynamic', async () => {
      const info = await getKeyInfo('<T @keyName="key1"/>', FILE_NAME, 'vue');

      expect(info.keyName?.type).toBe('expr');
    });

    it('handles empty strings (ref: #29)', async () => {
      const info = await getKeyInfo('<T keyName ns="" />', FILE_NAME, 'vue');

      expect(extractValue(info.namespace)).toBe('');
    });
  });
});
