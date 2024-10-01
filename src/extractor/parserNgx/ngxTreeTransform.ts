import { simplifyNode } from '../parser/nodeUtils.js';
import { GeneralNode } from '../parser/types.js';

function transformRecursive(root?: GeneralNode) {
  if (!root) {
    return;
  }

  switch (root.type) {
    case 'expr':
    case 'array':
      root.values.forEach((item, i) => {
        if (item.type === 'keyInfo' && item.keyName === undefined) {
          const nodeBefore = simplifyNode(root.values[i - 1]);
          if (nodeBefore.type === 'dict') {
            item.keyName = nodeBefore.value['key'];
            item.namespace = nodeBefore.value['ns'] ?? item.namespace;
            item.defaultValue =
              nodeBefore.value['defaultValue'] ?? item.defaultValue;
          } else {
            item.keyName = nodeBefore;
          }
        }
        transformRecursive(item);
      });
      break;
    case 'dict':
      Object.values(root.value).forEach(transformRecursive);
      root.unknown.forEach(transformRecursive);
      break;
    case 'keyInfo':
      transformRecursive(root.defaultValue);
      transformRecursive(root.keyName);
      transformRecursive(root.namespace);
      root.values.forEach(transformRecursive);
      break;
    case 'nsInfo':
      transformRecursive(root.name);
      root.values.forEach(transformRecursive);
      break;
    case 'primitive':
      return;
  }
}

export const ngxTreeTransform = (root: GeneralNode) => {
  transformRecursive(root);

  return { tree: root, report: { keys: [], warnings: [] } };
};
