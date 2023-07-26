// ---
// See HACKING.md for more details about what's in this file
// ---

import { load } from 'js-yaml';

export const Grammars = {
  TypeScript:
    'https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master/TypeScript.tmLanguage',
  TypeScriptReact:
    'https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master/TypeScriptReact.tmLanguage',
  Svelte:
    'https://raw.githubusercontent.com/sveltejs/language-tools/master/packages/svelte-vscode/syntaxes/svelte.tmLanguage.src.yaml',
  Vue: 'https://raw.githubusercontent.com/vuejs/vetur/master/syntaxes/vue.tmLanguage.json',
};

export const Licenses = [
  {
    grammars: ['TypeScript', 'TypeScriptReact'],
    license:
      'https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master/LICENSE.txt',
  },
  {
    grammars: ['Svelte'],
    license:
      'https://raw.githubusercontent.com/sveltejs/language-tools/master/LICENSE',
  },
  {
    grammars: ['Vue'],
    license: 'https://raw.githubusercontent.com/vuejs/vetur/master/LICENSE',
  },
];

const TypeScriptReactComment = `
<!--
  This TextMate grammar has been modified from the original one.
  '.tsx' tokens have been transformed into '.ts' to simplify use within the tolgee-cli project.

  You may find the original TextMate definition here:
  https://github.com/microsoft/TypeScript-TmLanguage/blob/master/TypeScriptReact.tmLanguage
-->
`.trim();

// Transformers receive the grammar and a Record<keyof Grammars, string>, where the value is the downloaded TM grammar.
export const Transformers = {
  TypeScriptReact: (self, grammars) => {
    // Transform "*.tsx" tokens into "*.ts" tokens if they are present in the base TS definition.
    // This allows machines written for TS to work for TSX.

    const transformed = self.replace(/[a-z.-]+\.tsx/g, (tokenType) => {
      const tokenTypeTs = tokenType.slice(0, -1);
      return tokenType !== 'source.tsx' &&
        grammars.TypeScript.includes(tokenTypeTs)
        ? tokenTypeTs
        : tokenType;
    });

    return `${TypeScriptReactComment}\n${transformed}`;
  },
  Svelte: (self) => {
    return JSON.stringify(load(self), null, 2).replaceAll(
      '"source.js"',
      '"source.ts"'
    );
  },
  Vue: (self) => {
    return self.replaceAll('"source.js"', '"source.ts"');
  },
};
