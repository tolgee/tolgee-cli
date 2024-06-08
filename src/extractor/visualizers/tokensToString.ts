import ansi from 'ansi-colors';
import { Token } from '../parser/types.js';
import { GeneralTokenType } from '../parser/generalMapper.js';

export type Colorizer = (text: string) => string;

export function tokensToString<T extends GeneralTokenType>(
  tokens: Iterable<Token<T>>,
  originalString: string,
  getColorizer: (token: Token<T>) => Colorizer
) {
  const result: string[] = [];
  let lastIndex = 0;
  let lastColorizer: Colorizer | undefined;
  for (const token of tokens) {
    const colorizer = getColorizer(token);
    if (lastIndex < token.startIndex) {
      if (colorizer === lastColorizer) {
        result.push(
          colorizer(originalString.substring(lastIndex, token.startIndex))
        );
      } else {
        result.push(
          ansi.grey(originalString.substring(lastIndex, token.startIndex))
        );
      }
    }
    lastIndex = token.endIndex;
    const fullText = originalString.substring(token.startIndex, token.endIndex);
    result.push(getColorizer(token)(fullText));
  }
  if (lastIndex < originalString.length) {
    result.push(originalString.substring(lastIndex, originalString.length));
  }
  return result
    .join('')
    .split('\n')
    .map((line, index) => `${ansi.gray(String(index + 1).padEnd(3))}${line}`)
    .join('\n');
}
