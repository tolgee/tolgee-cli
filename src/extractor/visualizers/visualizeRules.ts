import { Token } from '../parser/types.js';
import { tokensToString } from './tokensToString.js';
import ansi from 'ansi-colors';

const palette = [
  ansi.blue,
  ansi.red,
  ansi.yellow,
  ansi.bgBlue,
  ansi.bgRed,
  ansi.bgYellow,
];

export const visualizeRules = (
  tokens: Iterable<Token<any>>,
  originalString: string
) => {
  let paletteIndex = 0;
  const colors: Record<string, ansi.StyleFunction> = {};
  function getColor(rule: string) {
    if (!colors[rule]) {
      colors[rule] = palette[paletteIndex % palette.length];
      paletteIndex += 1;
    }
    return colors[rule];
  }

  const colorized = tokensToString(tokens, originalString, (token) => {
    if (token.customType) {
      return getColor(token.customType);
    } else {
      return ansi.white;
    }
  });

  return (
    colorized +
    '\n\n' +
    Object.entries({
      ...colors,
      ...{
        unknown: ansi.white,
        ignored: ansi.grey,
      },
    })
      .map(([rule, paint]) => paint(rule))
      .join('\n')
  );
};
