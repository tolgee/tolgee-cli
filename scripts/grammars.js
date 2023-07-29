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
  Vue: 'https://raw.githubusercontent.com/vuejs/language-tools/master/packages/vscode-vue/syntaxes/vue.tmLanguage.json',

  HTML: 'https://raw.githubusercontent.com/textmate/html.tmbundle/master/Syntaxes/HTML.plist',
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
    license:
      'https://raw.githubusercontent.com/vuejs/language-tools/master/packages/vscode-vue/LICENSE',
  },
];

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

    return transformed;
  },
  Svelte: (self) => {
    return JSON.stringify(load(self), null, 2).replaceAll(
      '"source.js"',
      '"source.ts"'
    );
  },
  Vue: (self) => {
    self = self.replaceAll('"source.js"', '"source.ts"');
    self = self.replaceAll('"source.js.jsx"', '"source.tsx"');
    const parsed = JSON.parse(self);

    // Hot-fix to make sure Vue interpolations are correctly tokenized as well as v-bind attributes.
    // For interpolations, this means they'll be looked up also beyond just the "template" section
    // but this isn't a huge deal. It won't affect JS and we skip other blocks anyways.
    // For tags, we only enable checking within an HTML tag (with a loose begin/end) check, which also
    // means it'll be looked up throughout the file even beyond the template block. We don't care for
    // the aforementioned reasons.
    //
    // Another point is we assume the CLI will consume valid/sane data and is not meant to parse
    // an invalid Vue file. An invalid Vue file would yield bad results anyways, so it's an acceptable
    // tradeoff based on our constrains and needs.
    parsed.repository['html-stuff'].patterns.unshift({
      include: '#vue-interpolations',
    });
    parsed.repository['html-stuff'].patterns.unshift({
      begin: '(<)([a-zA-Z0-9:-]+)',
      beginCaptures: {
        1: {
          name: 'punctuation.definition.tag.begin.html',
        },
        2: {
          name: 'entity.name.tag.$2.html.vue',
        },
      },
      end: '(/?>)',
      endCaptures: {
        1: {
          name: 'punctuation.definition.tag.end.html',
        },
      },
      patterns: [{ include: '#tag-stuff' }, { include: '#html-stuff' }],
    });

    return JSON.stringify(parsed, null, 2);
  },
};
