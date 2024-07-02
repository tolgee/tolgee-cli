import { Token } from '../parser/types.js';

export const tokensList = (tokens: Iterable<Token<string>>) => {
  const result: string[] = [];
  for (const t of tokens) {
    result.push(
      `${JSON.stringify(t.token).padEnd(30)} ${t.type.padEnd(40)} ${
        t.customType ?? ''
      }`
    );
  }
  return result.join('\n');
};
