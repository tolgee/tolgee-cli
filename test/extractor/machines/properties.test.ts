import tokenizer from '../../../src/extractor/tokenizer';
import propertiesMachine from '../../../src/extractor/machines/shared/properties';
import { interpret } from 'xstate';

const machine = interpret(propertiesMachine);

describe('Plain JavaScript', () => {
  describe.each([ 'js', 'ts' ])('JavaScript (.%s)', (ext) => {
    beforeEach(() => machine.start());
    afterEach(() => machine.stop());
    const FILE_NAME = `test.${ext}`

    it('extracts information from basic objects', async () => {
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
        'const a = { keyName: "key1", test: { defaultValue: "def value1" } }',
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

    it.each(['22', 'true', '{ test: true }', '[ 1, 2, 3 ]'])(
      'ignores non-string values (%s)',
      async (value) => {
        const tokens = await tokenizer(
          `const a = { keyName: ${value}, test: 22 }`,
          FILE_NAME
        );
        for (const token of tokens) {
          machine.send(token);
        }

        const snapshot = machine.getSnapshot();
        expect(snapshot.done).toBe(true);
        expect(snapshot.context.keyName).toBeNull();
        expect(snapshot.context.defaultValue).toBeNull();
        expect(snapshot.context.namespace).toBeNull();
      }
    );

    it('ignores declaration shorthands', async () => {
      const tokens = await tokenizer(
        'const a = { keyName, test: "something" }',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBeNull();
      expect(snapshot.context.defaultValue).toBeNull();
      expect(snapshot.context.namespace).toBeNull();
    });

    it('extracts static keys written as an expression', async () => {
      const tokens = await tokenizer(
        'const a = { ["keyName"]: "key1", [`defaultValue`]: "def value1" }',
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
  })

  describe('TypeScript', () => {
    beforeEach(() => machine.start());
    afterEach(() => machine.stop());
    const FILE_NAME = 'test.ts'

    it('gracefully ignores "as" cast', async () => {
      const tokens = await tokenizer(
        'const a = { keyName: "key1" as any, test: 22 }',
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

    it('gracefully ignores prefix cast', async () => {
      const tokens = await tokenizer(
        'const a = { keyName: <any> "key1", test: 22 }',
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
        'const a = { ["keyName" as SomeEnum]: "key1", test: 22 }',
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
        'const a = { [<SomeEnum> "keyName"]: "key1", test: 22 }',
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
  });
})

describe('JSX', () => {
  describe.each([ 'jsx', 'tsx' ])('Plain JSX (.%s)', (ext) => {
    beforeEach(() => machine.start());
    afterEach(() => machine.stop());
    const FILE_NAME = `test.${ext}`

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

    it('ignores boolean shorthands', async () => {
      const tokens = await tokenizer(
        '<T keyName someValue={"key1"}/>',
        FILE_NAME
      );
      for (const token of tokens) {
        if (!machine.getSnapshot().done) {
          machine.send(token);
        }
      }

      const snapshot = machine.getSnapshot();
      expect(snapshot.done).toBe(true);
      expect(snapshot.context.keyName).toBeNull();
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
  });

  // There is nothing to test for TSX specifically;
  // Leaving this so the person who'll stumble across a TSX quirk can laugh at me via `git blame` (and write tests :p)
  // describe('TSX', () => {})
});
