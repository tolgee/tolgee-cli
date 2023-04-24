import tokenizer from '../../../../src/extractor/tokenizer';
import propertiesMachine from '../../../../src/extractor/machines/shared/properties';
import { interpret } from 'xstate';

const machine = interpret(propertiesMachine);

describe('Plain JavaScript', () => {
  describe.each(['js', 'ts', 'jsx', 'tsx'])('JavaScript (.%s)', (ext) => {
    beforeEach(() => machine.start());
    afterEach(() => machine.stop());
    const FILE_NAME = `test.${ext}`;

    it('extracts information from basic objects', async () => {
      const tokens = await tokenizer(
        'const a = { key: "key1", defaultValue: \'default value\', ns: `ns1` test: 22 }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBe('default value');
      expect(snapshot.context.namespace).toBe('ns1');
    });

    it('extracts key when using keyName', async () => {
      const tokens = await tokenizer(
        'const a = { keyName: "key1", test: 22 }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('does not extract information from nested objects', async () => {
      const tokens = await tokenizer(
        'const a = { key: "key1", test: { defaultValue: "def value1" } }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('extracts static keys written as an expression', async () => {
      const tokens = await tokenizer(
        'const a = { ["key"]: "key1", [`defaultValue`]: "def value1" }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBe('def value1');
      expect(snapshot.context.namespace).toBeNull();
    });

    describe('dynamic data', () => {
      it('marks templates with ${} chunks as dynamic', async () => {
        const tokens = await tokenizer(
          'const a = { key: `dynamic-${i}`, test: "something" }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });

      it('marks strings with concatenations as dynamic', async () => {
        const tokens = await tokenizer(
          'const a = { key: "dynamic-" + i, test: "something" }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });

      it('marks plain variables as dynamic', async () => {
        const tokens = await tokenizer(
          'const a = { key: key, test: "something" }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });

      it('marks declaration shorthand as dynamic', async () => {
        const tokens = await tokenizer(
          'const a = { key, v: keyName, test: "something", ns }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBe(false);
      });

      it('handles empty strings (ref: #29)', async () => {
        const tokens = await tokenizer(
          'const a = { key: "key", ns: "" }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe('key');
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBe('');
      });
    });
  });

  describe.each(['ts', 'tsx'])('TypeScript (.%s)', (ext) => {
    beforeEach(() => machine.start());
    afterEach(() => machine.stop());
    const FILE_NAME = `test.${ext}`;

    it('gracefully ignores "as" cast', async () => {
      const tokens = await tokenizer(
        'const a = { key: "key1" as any, test: 22 }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('gracefully ignores "as" cast in complex keys', async () => {
      const tokens = await tokenizer(
        'const a = { ["key" as SomeEnum]: "key1", test: 22 }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    if (ext !== 'tsx') {
      // Test does not apply to TSX; <xxx> is interpreted as a component
      it('gracefully ignores prefix cast', async () => {
        const tokens = await tokenizer(
          'const a = { key: <any> "key1", test: 22 }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe('key1');
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });

      it('gracefully ignores prefix cast in complex keys', async () => {
        const tokens = await tokenizer(
          'const a = { [<SomeEnum> "key"]: "key1", test: 22 }',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe('key1');
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });
    }
  });
});

describe('JSX', () => {
  describe.each(['jsx', 'tsx'])('Plain JSX (.%s)', (ext) => {
    beforeEach(() => machine.start());
    afterEach(() => machine.stop());
    const FILE_NAME = `test.${ext}`;

    it('extracts from plain JavaScript objects', async () => {
      const tokens = await tokenizer(
        'const a = { key: "key1", test: 22 }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('extracts simple JSX props', async () => {
      const tokens = await tokenizer('<T keyName="key1"/>', FILE_NAME);
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('extracts JSX props written as dynamic', async () => {
      const tokens = await tokenizer('<T keyName={"key1"}/>', FILE_NAME);
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('is undisturbed by objects within properties', async () => {
      const tokens = await tokenizer(
        '<T properties={{ a: "b" }} keyName={"key1"}/>',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe('key1');
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('reaches completion if there are no properties', async () => {
      const tokens = await tokenizer('<T></T>', FILE_NAME);
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
    });

    it('reaches completion if there are no props (shorthand)', async () => {
      const tokens = await tokenizer('<T/>', FILE_NAME);
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
    });

    describe('dynamic data', () => {
      it('marks templates with ${} chunks as dynamic', async () => {
        const tokens = await tokenizer(
          '<T keyName={`dynamic-${i}`}/>',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });

      it('marks strings with concatenations as dynamic', async () => {
        const tokens = await tokenizer(
          '<T ns="heh" keyName={"dynamic-" + i}/>',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBe('heh');
      });

      it('marks plain variables as dynamic', async () => {
        const tokens = await tokenizer('<T keyName={key}/>', FILE_NAME);
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      });

      it('marks declaration shorthand as dynamic', async () => {
        const tokens = await tokenizer(
          '<T keyName someValue={"key1"} ns/>',
          FILE_NAME
        );
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBe(false);
      });

      it('handles empty strings (ref: #29)', async () => {
        const tokens = await tokenizer('<T keyName ns="" />', FILE_NAME);
        for (const token of tokens) {
          if (!machine.getSnapshot().done) {
            machine.send(token);
          }
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBe(false);
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBe('');
      });
    });
  });

  // There is nothing to test for TSX specifically;
  // Leaving this so the person who'll stumble across a TSX quirk can laugh at me via `git blame` (and write tests :p)
  // describe('TSX', () => {})
});

describe('Svelte', () => {
  beforeEach(() => machine.start());
  afterEach(() => machine.stop());

  it('extracts simple HTML props', async () => {
    const tokens = await tokenizer('<T keyName="key1"/>', 'App.svelte');
    for (const token of tokens) {
      if (!machine.getSnapshot().done) {
        machine.send(token);
      }
    }

    const snapshot = machine.getSnapshot();
    expect(snapshot.done).toBe(true);
    expect(snapshot.context.keyName).toBe('key1');
    expect(snapshot.context.defaultValue).toBeNull();
    expect(snapshot.context.namespace).toBeNull();
  });

  it('extracts simple unquoted HTML props', async () => {
    const tokens = await tokenizer('<T keyName=key1/>', 'App.svelte');
    for (const token of tokens) {
      if (!machine.getSnapshot().done) {
        machine.send(token);
      }
    }

    const snapshot = machine.getSnapshot();
    expect(snapshot.done).toBe(true);
    expect(snapshot.context.keyName).toBe('key1');
    expect(snapshot.context.defaultValue).toBeNull();
    expect(snapshot.context.namespace).toBeNull();
  });

  it('extracts HTML props written as static JS expressions', async () => {
    const tokens = await tokenizer('<T keyName={"key1"}/>', 'App.svelte');
    for (const token of tokens) {
      if (!machine.getSnapshot().done) {
        machine.send(token);
      }
    }

    const snapshot = machine.getSnapshot();
    expect(snapshot.done).toBe(true);
    expect(snapshot.context.keyName).toBe('key1');
    expect(snapshot.context.defaultValue).toBeNull();
    expect(snapshot.context.namespace).toBeNull();
  });

  it('is undisturbed by objects within properties', async () => {
    const tokens = await tokenizer(
      '<T properties={{ a: "b" }} keyName={"key1"}/>',
      'App.svelte'
    );
    for (const token of tokens) {
      if (!machine.getSnapshot().done) {
        machine.send(token);
      }
    }

    const snapshot = machine.getSnapshot();
    expect(snapshot.done).toBe(true);
    expect(snapshot.context.keyName).toBe('key1');
    expect(snapshot.context.defaultValue).toBeNull();
    expect(snapshot.context.namespace).toBeNull();
  });

  it('reaches completion if there are no properties', async () => {
    const tokens = await tokenizer('<T></T>', 'App.svelte');
    for (const token of tokens) {
      if (!machine.getSnapshot().done) {
        machine.send(token);
      }
    }

    const snapshot = machine.getSnapshot();
    expect(snapshot.done).toBe(true);
  });

  it('reaches completion if there are no props (shorthand)', async () => {
    const tokens = await tokenizer('<T/>', 'App.svelte');
    for (const token of tokens) {
      if (!machine.getSnapshot().done) {
        machine.send(token);
      }
    }

    const snapshot = machine.getSnapshot();
    expect(snapshot.done).toBe(true);
  });

  describe('dynamic data', () => {
    it('marks templates with ${} chunks as dynamic', async () => {
      const tokens = await tokenizer(
        '<T keyName={`dynamic-${i}`}/>',
        'App.svelte'
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe(false);
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('marks HTML properties with inline expressions as dynamic', async () => {
      const tokens = await tokenizer(
        '<T keyName="dynamic-{i}"/>',
        'App.svelte'
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe(false);
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('marks strings with concatenations as dynamic', async () => {
      const tokens = await tokenizer(
        '<T ns="heh" keyName={"dynamic-" + i}/>',
        'App.svelte'
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe(false);
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBe('heh');
    });

    it('marks plain variables as dynamic', async () => {
      const tokens = await tokenizer('<T keyName={key}/>', 'App.svelte');
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe(false);
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('marks declaration shorthand as dynamic', async () => {
      const tokens = await tokenizer(
        '<T keyName someValue={"key1"} ns/>',
        'App.svelte'
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe(false);
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBe(false);
    });

    it('handles empty strings (ref: #29)', async () => {
      const tokens = await tokenizer('<T keyName ns="" />', 'App.svelte');
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBe(false);
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBe('');
    });
  });
});
