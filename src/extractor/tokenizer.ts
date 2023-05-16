import type { IOnigLib, IGrammar } from 'vscode-textmate';

import { join, extname } from 'path';
import { readFile } from 'fs/promises';

import { Registry, parseRawGrammar, INITIAL } from 'vscode-textmate';
import { loadWASM, OnigScanner, OnigString } from 'vscode-oniguruma';

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
}

const GRAMMAR_PATH = join(__dirname, '..', '..', 'textmate');
const GrammarFiles: Record<Grammar, string> = {
  [Grammar.TYPESCRIPT]: join(GRAMMAR_PATH, 'TypeScript.tmLanguage'),
  [Grammar.TYPESCRIPT_TSX]: join(GRAMMAR_PATH, 'TypeScriptReact.tmLanguage'),
  [Grammar.SVELTE]: join(GRAMMAR_PATH, 'Svelte.tmLanguage'),
};

let oniguruma: Promise<IOnigLib>;
let registry: Registry;

async function initializeOniguruma() {
  const wasmBlobPath = require
    .resolve('vscode-oniguruma')
    .replace('main.js', 'onig.wasm');

  const wasmBlob = await readFile(wasmBlobPath);
  await loadWASM(wasmBlob);

  return <IOnigLib>{
    createOnigScanner: (patterns) => new OnigScanner(patterns),
    createOnigString: (s) => new OnigString(s),
  };
}

async function loadGrammar(scope: Grammar) {
  const file = GrammarFiles[scope];
  if (!file) return null;

  const grammar = await readFile(file, 'utf8');
  return grammar.startsWith('{')
    ? JSON.parse(grammar)
    : parseRawGrammar(grammar);
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
  let stack = INITIAL;
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
    registry = new Registry({
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
