import type { IOnigLib, IGrammar } from 'vscode-textmate';

import { extname } from 'path';
import { readFile } from 'fs/promises';
import { createRequire } from 'module';

import TextMate from 'vscode-textmate';
import Oniguruma from 'vscode-oniguruma';

export type Token = {
  type: string;
  token: string;
  line: number;
  startIndex: number;
  endIndex: number;
  scopes: string[];
};

const enum Grammar {
  TYPESCRIPT = 'source.ts',
  TYPESCRIPT_TSX = 'source.tsx',
  SVELTE = 'source.svelte',
  VUE = 'source.vue',
}

const GRAMMAR_PATH = new URL('../../textmate/', import.meta.url);
const GrammarFiles: Record<Grammar, URL> = {
  [Grammar.TYPESCRIPT]: new URL('TypeScript.tmLanguage', GRAMMAR_PATH),
  [Grammar.TYPESCRIPT_TSX]: new URL('TypeScriptReact.tmLanguage', GRAMMAR_PATH),
  [Grammar.SVELTE]: new URL('Svelte.tmLanguage', GRAMMAR_PATH),
  [Grammar.VUE]: new URL('Vue.tmLanguage', GRAMMAR_PATH),
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
  return grammar.startsWith('{')
    ? JSON.parse(grammar)
    : TextMate.parseRawGrammar(grammar);
}

function extnameToGrammar(extname: string) {
  switch (extname) {
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
    case '.svelte':
      return Grammar.SVELTE;
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
      // Opinionated take: if a token is scope-less, chances are we don't care about it.
      // Ditching it allows us to reduce complexity from the state machine's POV.
      if (token.scopes.length !== 1) {
        const codeToken = code.slice(
          linePtr + token.startIndex,
          linePtr + token.endIndex
        );

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

  const fileType = extname(fileName);
  const grammarName = extnameToGrammar(fileType);
  if (!grammarName) {
    throw new Error(`Cannot find grammar for file type ${fileType}`);
  }

  const grammar = await registry.loadGrammar(grammarName);
  if (!grammar) {
    throw new Error(`Cannot load grammar ${grammarName}`);
  }

  return tokenize(code, grammar);
}
