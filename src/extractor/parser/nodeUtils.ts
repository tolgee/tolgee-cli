import { GeneralNode, StringNode } from './types.js';

export function isPrimitive(node: GeneralNode) {
  return node.type === 'primitive';
}
export function isString(node: GeneralNode) {
  return node.type === 'primitive' && typeof node.value === 'string';
}

export function isEmptyExpr(node: GeneralNode) {
  return node.type === 'expr' && node.values.length === 0;
}

export function extractString(node?: GeneralNode) {
  return node && isString(node) ? (node as StringNode).value : undefined;
}

export function extractValue(node?: GeneralNode) {
  return node && node.type === 'primitive' ? node.value : undefined;
}

export function simplifyNode(node: GeneralNode) {
  if (node?.type === 'expr' && node.values.length === 1) {
    return node.values[0];
  }
  return node;
}

export type ExtractedKeyNodes = {
  line: number;
  nsFromContext: boolean;
} & Partial<{
  keyName: GeneralNode | undefined;
  namespace: GeneralNode | undefined;
  defaultValue: GeneralNode | undefined;
}>;
