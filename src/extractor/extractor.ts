import tokenizer from './tokenizer.js';
import { ParserReact } from './parserReact/ParserReact.js';
import { Token } from './parser/types.js';
import { tokensList } from './visualizers/printTokens.js';
import { visualizeRules } from './visualizers/visualizeRules.js';
import { ParserVue } from './parserVue/ParserVue.js';
import { ParserNgx } from './parserNgx/ParserNgx.js';
import { ParserSvelte } from './parserSvelte/ParserSvelte.js';
import { ExtractOptions, ExtractionResult, ParserType } from './index.js';
import { IteratorListener } from './parser/iterator.js';

function pickParser(format: ParserType) {
  switch (format) {
    case 'react':
      return ParserReact();
    case 'vue':
      return ParserVue();
    case 'svelte':
      return ParserSvelte();
    case 'ngx':
      return ParserNgx();
  }
}

export async function extractTreeAndReport(
  code: string,
  fileName: string,
  parserType: ParserType,
  options: ExtractOptions
) {
  const debug = options.verbose?.includes('extractor');
  const tokens = (await tokenizer(code, fileName)) as Token<string>[];

  const parser = pickParser(parserType);

  const tokensMerged: Token<string>[] = [];
  const tokensWithRules: Token<string>[] = [];

  let onAccept: IteratorListener<any> | undefined = undefined;
  if (debug) {
    onAccept = (token, type) => {
      tokensMerged.push(token);
      tokensWithRules.push({ ...token, customType: type });
    };
  }

  const result = parser.parse({
    tokens,
    onAccept,
    options,
  });

  if (debug) {
    console.log(
      JSON.stringify(result.tree, null, 2) +
        '\n' +
        tokensList(tokensMerged) +
        '\n' +
        visualizeRules(tokensMerged, code) +
        '\n' +
        visualizeRules(tokensWithRules, code) +
        '\n'
    );
  }

  return result;
}

export default async function extractor(
  code: string,
  fileName: string,
  parserType: ParserType,
  options: ExtractOptions
): Promise<ExtractionResult> {
  const result = await extractTreeAndReport(
    code,
    fileName,
    parserType,
    options
  );
  return result.report;
}
