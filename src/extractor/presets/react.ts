import {
  isConsumable,
  greedilyConsumeBlock,
  extractString,
  extractObject,
} from '../languages/javascript';

type CreateElementBlock = {
  component: string;
  props: Record<string, string>;
  children: string | null;
};

function parseCreateElement(code: string): CreateElementBlock {
  code = code.slice(1, -1).trim(); // Remove parenthesis

  const firstArgDelimiterIdx = code.indexOf(',');
  if (firstArgDelimiterIdx === -1) {
    return {
      component: code,
      props: {},
      children: null,
    };
  }

  const component = code.slice(0, firstArgDelimiterIdx).trim();
  code = code.slice(firstArgDelimiterIdx + 1).trim();

  let props = {};
  let consumed = code.indexOf(',') || code.length;
  if (code.startsWith('{')) {
    const read = extractObject(code);
    consumed = read.consumed;
    props = read.extracted;
  }

  code = code.slice(consumed).trim();
  // If there's code left, trim the comma and consume the rest as the children
  const children = code ? code.slice(1).trim() : null;

  return {
    component: component,
    props: props,
    children: children,
  };
}

function extractCreateElements(code: string): CreateElementBlock[] {
  const blocks = [];

  for (const match of code.matchAll(/React\s*\.\s*createElement\s*\(/g)) {
    const argsStartIdx = match.index! + match[0].length - 1;
    const createElementArgs = greedilyConsumeBlock(code.slice(argsStartIdx));
    blocks.push(parseCreateElement(createElementArgs));
  }

  return blocks;
}

export default async function (code: string) {
  const keys = [];

  // React.createElement extraction
  const createElementOccurrences = extractCreateElements(code).filter(
    (el) => el.component === 'T'
  );
  for (const occ of createElementOccurrences) {
    let rawKey = occ.props.keyName;
    if (!rawKey) {
      if (!occ.children || !isConsumable(occ.children)) continue;
      rawKey = greedilyConsumeBlock(occ.children);
    }

    const key = extractString(rawKey);
    if (!key) continue;

    keys.push(key);
  }

  // JSX <T> extraction

  // useTranslate() hook extraction

  return keys;
}
