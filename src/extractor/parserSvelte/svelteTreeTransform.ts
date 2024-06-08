import { GeneralNode } from '../parser/types.js';
import { SVELTE_SCRIPT } from './contextConstants.js';

/**
 * Putting scripts to the top
 *
 * ```
 * <div>{$t('key1')}</div>
 * <script>
 *  const {t} = getTranslate('namespace')
 * </script>
 * ```
 *
 * transforming essentially to this:
 *
 * ```
 * const {t} = getTranslate('namespace')
 *
 * <div>{$t('key1')}</div>
 * ```
 */
export const svelteTreeTransform = (root: GeneralNode) => {
  if (root.type !== 'expr') {
    return { tree: root };
  }

  const scripts: GeneralNode[] = [];
  const other: GeneralNode[] = [];

  for (const node of root.values) {
    if (node.type === 'expr' && node.context === SVELTE_SCRIPT) {
      scripts.push(...node.values);
    } else {
      other.push(node);
    }
  }

  // put scripts to top
  // and other to bottom
  root.values = [...scripts, ...other];

  return { tree: root };
};
