import tokenizer from '../../../../src/extractor/tokenizer.js';
import vueDecoder from '../../../../src/extractor/machines/vue/decoder.js';
import { interpret } from 'xstate';

const machine = interpret(vueDecoder);

async function runMachine(code: string) {
  const tokens = await tokenizer(code, 'Test.vue');

  machine.start();
  for (const token of tokens) {
    if (!machine.getSnapshot().done) {
      machine.send(token);
    }
  }

  const snapshot = machine.getSnapshot();
  machine.stop();
  return snapshot;
}

it('decodes a simple SFC', async () => {
  const testSfc = `
    <script setup>
      console.log('owo')
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(true);
  expect(snapshot.context.script.length).toBe(0);
  expect(owoToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
});

it('decodes a SFC using a plain script', async () => {
  const testSfc = `
    <script>
      export default {
        mounted () {
          console.log('uwu')
        }
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(false);
  expect(snapshot.context.setup.length).toBe(0);
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
});

it('decodes a SFC using a both a setup and a plain script', async () => {
  const testSfc = `
    <script setup>
      console.log('owo')
    </script>
    <script>
      export default {
        mounted () {
          console.log('uwu')
        }
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(true);
  expect(owoToken).not.toBeUndefined();
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
});

it('separates the setup() function of the global script', async () => {
  const testSfc = `
    <script>
      export default {
        setup () {
          console.log('owo')
        }
        mounted () {
          console.log('uwu')
        }
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(false);
  expect(owoToken).not.toBeUndefined();
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
});

it('separates the setup() function of the global script (defined as property, arrow function)', async () => {
  const testSfc = `
    <script>
      export default {
        setup: () => {
          console.log('owo')
        }
        mounted: () => {
          console.log('uwu')
        }
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(false);
  expect(snapshot.context.invalidSetup).toBeNull();
  expect(owoToken).not.toBeUndefined();
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
});

it('separates the setup() function of the global script (defined as property, function)', async () => {
  const testSfc = `
    <script>
      export default {
        setup: function () {
          console.log('owo')
        }
        mounted: function () {
          console.log('uwu')
        }
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(false);
  expect(snapshot.context.invalidSetup).toBeNull();
  expect(owoToken).not.toBeUndefined();
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
});

it('correctly prioritizes the <script setup> if a setup() function is present (script setup before)', async () => {
  const testSfc = `
    <script setup>
      console.log('owo')
    </script>
    <script>
      export default {
        setup () {
          console.log('NYA')
        }
        mounted () {
          console.log('uwu')
        }
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const nyaToken = snapshot.context.setup.find((t) => t.token === 'NYA');
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(true);
  expect(owoToken).not.toBeUndefined();
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
  expect(nyaToken).toBeUndefined();
});

it('correctly prioritizes the <script setup> if a setup() function is present (script setup after)', async () => {
  const testSfc = `
    <script>
      export default {
        setup () {
          console.log('NYA')
        }
        mounted () {
          console.log('uwu')
        }
      }
    </script>
    <script setup>
      console.log('owo')
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  const owoToken = snapshot.context.setup.find((t) => t.token === 'owo');
  const nyaToken = snapshot.context.setup.find((t) => t.token === 'NYA');
  const uwuToken = snapshot.context.script.find((t) => t.token === 'uwu');
  const meowToken = snapshot.context.template.find((t) => t.token === 'meow');

  expect(snapshot.context.scriptSetupConsumed).toBe(true);
  expect(owoToken).not.toBeUndefined();
  expect(uwuToken).not.toBeUndefined();
  expect(meowToken).not.toBeUndefined();
  expect(nyaToken).toBeUndefined();
});

it('reports bad use of setup when assigned a variable/reference', async () => {
  const testSfc = `
    <script>
      function mySetup () {
        console.log('owo');
      }

      export default {
        setup: mySetup
      }
    </script>
    <template>
      <p>meow</p>
    </template>
  `;

  const snapshot = await runMachine(testSfc);
  expect(snapshot.context.invalidSetup).not.toBeNull();
});
