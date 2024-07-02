import { ExtractedKey, Warning } from '../index.js';
import { ExpressionNode, GeneralNode } from '../parser/types.js';
import {
  VUE_SCRIPT_REGULAR,
  VUE_SCRIPT_SETUP,
  VUE_COMPONENT_CONFIG,
} from './contextConstants.js';

type Context = {
  warnings: Warning[];
  keys: ExtractedKey[];
};

/*
 * We get this
 *
 * `(item) {item, item}`
 *
 * so we put the expression insides one level up (never mind the arguments):
 *
 * `item, item, item`
 */
function flattenOneLevel(nodes: GeneralNode[]) {
  const result: GeneralNode[] = [];
  nodes.forEach((node) => {
    if (node.type === 'expr') {
      result.push(...node.values);
    } else {
      result.push(node);
    }
  });
  return result;
}

/*
 * We get structure like this
 * {
 *   setup(item) {
 *      item, item
 *   }
 * }
 * and setup content should be on top level
 */
function bringSetupToTopLevel(context: Context, node: ExpressionNode) {
  const setupContent: GeneralNode[] = [];
  for (const item of node.values) {
    if (item.type === 'dict' && item.context === VUE_COMPONENT_CONFIG) {
      const { setup, ...rest } = item.value;
      if (setup.type === 'expr') {
        if (setup.values.length === 0) {
          context.warnings.push({
            line: setup.line,
            warning: 'W_VUE_SETUP_IS_A_REFERENCE',
          });
        }
        setupContent.push(...flattenOneLevel(setup.values));
        item.value = { ...rest };
      }
    }
  }
  return [node, ...setupContent];
}

/**
 * Putting scripts to the top and extracting setup function, so:
 *
 * ```
 * <template>
 *  <div>{t('key1')}</div>
 * <template>
 * <script>
 * export default {
 *   setup() {
 *     const {t} = useTranslate('namespace')
 *   },
 *   ...
 * }
 * </script>
 * ```
 *
 * transforming essentially to this:
 *
 * ```
 * export default {
 *   ...
 * }
 * const {t} = useTranslate('namespace')
 * <template>
 *  <div>{{ t('key1') }}</div>
 * <template>
 * ```
 */
export const vueTreeTransform = (root: GeneralNode) => {
  if (root.type !== 'expr') {
    return { tree: root };
  }

  const context: Context = {
    keys: [],
    warnings: [],
  };

  const scripts: GeneralNode[] = [];
  const other: GeneralNode[] = [];

  for (const node of root.values) {
    if (
      node.type === 'expr' &&
      (node.context === VUE_SCRIPT_REGULAR || node.context === VUE_SCRIPT_SETUP)
    ) {
      if (node.context === VUE_SCRIPT_REGULAR) {
        // we need to dig deeper for the `setup` function
        scripts.push(...bringSetupToTopLevel(context, node));
      } else {
        scripts.push(...node.values);
      }
    } else {
      other.push(node);
    }
  }

  // put scripts to top
  // and other to bottom
  root.values = [...scripts, ...other];

  return { tree: root, report: context };
};
