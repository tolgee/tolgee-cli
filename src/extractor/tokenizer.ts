import type { IOnigLib, IGrammar } from 'vscode-textmate';

import { extname } from 'path';
import { readFile } from 'fs/promises';
import { createRequire } from 'module';

import TextMate from 'vscode-textmate';
import Oniguruma from 'vscode-oniguruma';
import { Token } from './parser/types.js';

const enum Grammar {
  TYPESCRIPT = 'source.ts',
  TYPESCRIPT_TSX = 'source.tsx',
  SVELTE = 'source.svelte',
  VUE = 'source.vue',
  ANGULAR_EXPRESSION = 'expression.ng',
  ANGULAR_HTML = 'text.html.derivative.ng',
  ANGULAR_INLINE_TEMPLATE = 'inline-template.ng',
  ANGULAR_LET_DECLARATION = 'template.let.ng',
  ANGULAR_TEMPLATE = 'template.ng',
  ANGULAR_TEMPLATE_BLOCKS = 'template.blocks.ng',
  // ANGULAR_HTML_BASIC = 'text.html.basic',
  HTML = 'text.html.basic',
  HTML_D = 'text.html.derivative',
}

const GRAMMAR_PATH = new URL('../../textmate/', import.meta.url);
const GrammarFiles: Record<Grammar, URL> = {
  [Grammar.TYPESCRIPT]: new URL('TypeScript.tmLanguage', GRAMMAR_PATH),
  [Grammar.TYPESCRIPT_TSX]: new URL('TypeScriptReact.tmLanguage', GRAMMAR_PATH),
  [Grammar.SVELTE]: new URL('Svelte.tmLanguage', GRAMMAR_PATH),
  [Grammar.VUE]: new URL('Vue.tmLanguage', GRAMMAR_PATH),
  [Grammar.ANGULAR_EXPRESSION]: new URL(
    'AngularExpression.tmLanguage',
    GRAMMAR_PATH
  ),
  [Grammar.ANGULAR_HTML]: new URL('AngularHtml.tmLanguage', GRAMMAR_PATH),
  [Grammar.ANGULAR_INLINE_TEMPLATE]: new URL(
    'AngularInlineTemplate.tmLanguage',
    GRAMMAR_PATH
  ),
  [Grammar.ANGULAR_LET_DECLARATION]: new URL(
    'AngularLetDeclaration.tmLanguage',
    GRAMMAR_PATH
  ),
  [Grammar.ANGULAR_TEMPLATE]: new URL(
    'AngularTemplate.tmLanguage',
    GRAMMAR_PATH
  ),
  [Grammar.ANGULAR_TEMPLATE_BLOCKS]: new URL(
    'AngularTemplateBlocks.tmLanguage',
    GRAMMAR_PATH
  ),
  [Grammar.HTML]: new URL('HTML.tmLanguage', GRAMMAR_PATH),
  [Grammar.HTML_D]: new URL('HTML.tmLanguage', GRAMMAR_PATH),
};

let oniguruma: Promise<IOnigLib>;
let registry: TextMate.Registry;

async function initializeOniguruma(): Promise<IOnigLib> {
  const require = createRequire(import.meta.url);
  const wasmBlobPath = require
    .resolve('vscode-oniguruma')
    .replace('main.js', 'onig.wasm');

  const wasmBlob = await readFile(wasmBlobPath);
  await Oniguruma.loadWASM(wasmBlob);

  return {
    createOnigScanner: (patterns) => new Oniguruma.OnigScanner(patterns),
    createOnigString: (s) => new Oniguruma.OnigString(s),
  };
}

async function loadGrammar(scope: Grammar) {
  const file = GrammarFiles[scope];
  if (!file) return null;

  const grammar = await readFile(file, 'utf8');
  return JSON.parse(grammar);
}

function fileNameToGrammar(fileName: string) {
  const ext = extname(fileName);
  switch (ext) {
    case '.js':
    case '.mjs':
    case '.cjs':
    case '.ts':
    case '.mts':
    case '.cts':
      return Grammar.TYPESCRIPT;
    case '.jsx':
    case '.tsx':
      return Grammar.TYPESCRIPT_TSX;
    case '.vue':
      return Grammar.VUE;
    case '.svelte':
      return Grammar.SVELTE;
    case '.html':
      if (/.*\.component\.html/.test(fileName)) {
        return Grammar.ANGULAR_HTML;
      } else {
        return Grammar.HTML;
      }
  }
}

function tokenize(code: string, grammar: IGrammar) {
  let stack = TextMate.INITIAL;
  let linePtr = 0;
  const lines = code.split('\n');
  const tokens: Token[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const res = grammar.tokenizeLine(line, stack);

    for (const token of res.tokens) {
      const codeToken = code.slice(
        linePtr + token.startIndex,
        linePtr + token.endIndex
      );

      // Opinionated take: if a token is scope-less and void, chances are we don't care about it.
      // Ditching it allows us to reduce complexity from the state machine's POV.
      if (token.scopes.length !== 1 || codeToken.trim()) {
        tokens.push({
          type: token.scopes[token.scopes.length - 1],
          token: codeToken,
          line: i + 1,
          startIndex: linePtr + token.startIndex,
          endIndex: linePtr + token.endIndex,
          scopes: token.scopes,
        });
      }
    }

    tokens.push({
      type: 'newline',
      token: '\n',
      line: i + 1,
      startIndex: linePtr + line.length,
      endIndex: linePtr + line.length + 1,
      scopes: [],
    });

    linePtr += line.length + 1;
    stack = res.ruleStack;
  }

  return tokens;
}

export default async function (code: string, fileName: string) {
  if (!oniguruma) {
    // Lazily initialize the WebAssembly runtime
    oniguruma = initializeOniguruma();
    registry = new TextMate.Registry({
      onigLib: oniguruma,
      loadGrammar: loadGrammar,
    });
  }

  const grammarName = fileNameToGrammar(fileName);
  if (!grammarName) {
    throw new Error(`Cannot find grammar for file type ${fileName}`);
  }

  const grammar = await registry.loadGrammar(grammarName);
  if (!grammar) {
    throw new Error(`Cannot load grammar ${grammarName}`);
  }

  return tokenize(code, grammar);
}
