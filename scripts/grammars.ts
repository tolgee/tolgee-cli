// ---
// See HACKING.md for more details about what's in this file
// ---

import { load } from 'js-yaml';

type UrlString = `https://${string}`;

export type LicenseInformation = {
  grammars: string[];
  license: UrlString;
};

export type Transformer = (
  self: string,
  grammars: Record<string, string>
) => string;

export type GrammarName = keyof typeof Grammars;

// ---

export const Grammars: Record<string, UrlString> = {
  TypeScript:
    'https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master/TypeScript.tmLanguage',
  TypeScriptReact:
    'https://raw.githubusercontent.com/microsoft/TypeScript-TmLanguage/master/TypeScriptReact.tmLanguage',
  Svelte:
    'https://raw.githubusercontent.com/sveltejs/language-tools/master/packages/svelte-vscode/syntaxes/svelte.tmLanguage.src.yaml',
  Vue: 'https://raw.githubusercontent.com/vuejs/language-tools/master/extensions/vscode/syntaxes/vue.tmLanguage.json',
  AngularExpression:
    'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/main/packages/tm-grammars/grammars/angular-expression.json',
  AngularHtml:
    'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/main/packages/tm-grammars/grammars/angular-html.json',
  AngularInlineTemplate:
    'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/main/packages/tm-grammars/grammars/angular-inline-template.json',
  AngularLetDeclaration:
    'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/main/packages/tm-grammars/grammars/angular-let-declaration.json',
  AngularTemplateBlocks:
    'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/main/packages/tm-grammars/grammars/angular-template-blocks.json',
  AngularTemplate:
    'https://raw.githubusercontent.com/shikijs/textmate-grammars-themes/main/packages/tm-grammars/grammars/angular-template.json',
  HTML: 'https://raw.githubusercontent.com/textmate/html.tmbundle/master/Syntaxes/HTML.plist',
};

export const Licenses: LicenseInformation[] = [
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
      'https://raw.githubusercontent.com/vuejs/language-tools/master/extensions/vscode/LICENSE',
  },
  {
    grammars: [
      'AngularExpression',
      'AngularHtml',
      'AngularInlineTemplate',
      'AngularLetDeclaration',
      'AngularTemplateBlocks',
      'AngularTemplate',
    ],
    license:
      'https://raw.githubusercontent.com/ghaschel/vscode-angular-html/master/LICENSE',
  },
];

// Transformers receive the grammar and a Record<keyof Grammars, string>, where the value is the downloaded TM grammar.
export const Transformers: Record<string, Transformer> = {
  TypeScriptReact: (self, grammars) => {
    // Transform "*.tsx" tokens into "*.ts" tokens if they are present in the base TS definition.
    // This allows machines written for TS to work for TSX.
    return self.replace(/[a-z.-]+\.tsx/g, (tokenType) => {
      const tokenTypeTs = tokenType.slice(0, -1);
      return tokenType !== 'source.tsx' &&
        grammars.TypeScript.includes(tokenTypeTs)
        ? tokenTypeTs
        : tokenType;
    });
  },
  Svelte: (self) => {
    return JSON.stringify(load(self)).replaceAll('"source.js"', '"source.ts"');
  },
  AngularHtml: (self) => {
    const parsed: any = load(self);
    // including angular templates
    parsed.patterns.push({ include: 'expression.ng' });
    parsed.patterns.push({ include: 'inline-template.ng' });
    parsed.patterns.push({ include: 'template.let.ng' });
    parsed.patterns.push({ include: 'template.ng' });
    parsed.patterns.push({ include: 'template.blocks.ng' });

    return JSON.stringify(parsed);
  },
  AngularTemplateBlocks: (self) => {
    return JSON.stringify(load(self)).replaceAll('"source.js"', '"source.ts"');
  },
  Vue: (self) => {
    self = self.replaceAll('"source.js"', '"source.ts"');
    self = self.replaceAll('"source.js.jsx"', '"source.tsx"');
    const parsed = JSON.parse(self);

    // Hot-fix to make sure Vue interpolations are correctly tokenized as well as v-bind attributes.
    // For interpolations, this means they'll be looked up also beyond just the "template" section
    // but this isn't a huge deal. It won't affect JS, and we skip other blocks anyway.
    // For tags, we only enable checking within an HTML tag (with a loose begin/end) check, which also
    // means it'll be looked up throughout the file even beyond the template block. We don't care for
    // the aforementioned reasons.
    //
    // Another point is we assume the CLI will consume valid/sane data and is not meant to parse
    // an invalid Vue file. An invalid Vue file would yield bad results anyway, so it's an acceptable
    // tradeoff based on our constraints and needs.
    parsed.repository['html-stuff'].patterns.splice(1, 0, {
      include: '#vue-interpolations',
    });

    parsed.repository['html-stuff'].patterns.splice(1, 0, {
      begin: '(<)([a-zA-Z0-9:-]+)',
      beginCaptures: {
        1: {
          name: 'punctuation.definition.tag.begin.html',
        },
        2: {
          name: 'entity.name.tag.$2.html.vue',
        },
      },
      end: '((/>)|(?<=>))',
      endCaptures: {
        1: {
          name: 'punctuation.definition.tag.end.html',
        },
      },
      patterns: [{ include: '#tag-stuff' }],
    });

    return JSON.stringify(parsed);
  },
};
