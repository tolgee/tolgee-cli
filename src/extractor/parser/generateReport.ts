import { MagicCommentEvent } from './extractComment.js';
import { ExtractOptions, ExtractedKey, Warning } from '../index.js';
import { GeneralNode, KeyInfoNode, NamespaceInfoNode } from './types.js';
import { extractString, isString } from './nodeUtils.js';

export type Report = {
  keys: ExtractedKey[];
  warnings: Warning[];
};

type Context = {
  commentMap: Map<number, MagicCommentEvent>;
  unusedComments: Set<MagicCommentEvent>;
  options: ExtractOptions;
  warnings: Warning[];
  keys: ExtractedKey[];
};

function shouldBeIgnored(context: Context, line: number) {
  const commentAtLine = context.commentMap.get(line - 1);
  const isIgnore =
    commentAtLine?.type === 'MAGIC_COMMENT' && commentAtLine.kind === 'ignore';
  if (isIgnore) {
    context.unusedComments.delete(commentAtLine);
  }
  return isIgnore;
}

function keyInfoFromComment(
  context: Context,
  line: number
): ExtractedKey | undefined {
  const commentAtLine = context.commentMap.get(line - 1);
  const isKeyInfo =
    commentAtLine?.type === 'MAGIC_COMMENT' && commentAtLine.kind === 'key';
  if (isKeyInfo) {
    context.unusedComments.delete(commentAtLine);
    return {
      keyName: commentAtLine.keyName,
      namespace: commentAtLine.namespace,
      defaultValue: commentAtLine.defaultValue,
      line: commentAtLine.line,
    };
  }
  return undefined;
}

function reportKey(
  context: Context,
  node: KeyInfoNode,
  contextNs: NamespaceInfoNode | undefined
) {
  const { strictNamespace, defaultNamespace } = context.options;
  const { keys, warnings } = context;
  const {
    keyName,
    namespace: keyNs,
    defaultValue,
    line,
    dependsOnContext,
    optionsDynamic,
  } = node;

  if (shouldBeIgnored(context, line)) {
    return { keys, warnings };
  }

  const overrideInfo = keyInfoFromComment(context, node.line);

  if (overrideInfo) {
    // key info is overriten by comment
    keys.push(overrideInfo);
    return;
  }

  if (!keyName || !isString(keyName)) {
    // dynamic key or key not present
    warnings.push({ line, warning: 'W_DYNAMIC_KEY' });
    return;
  }

  if (dependsOnContext && !contextNs && !keyNs && strictNamespace) {
    // there is no namespace source so namespace is ambiguous
    warnings.push({ line, warning: 'W_MISSING_T_SOURCE' });
    return;
  }

  if (optionsDynamic && strictNamespace) {
    // options of the key can't be analyzed, so again ambiguous namespace
    warnings.push({ line, warning: 'W_DYNAMIC_OPTIONS' });
    return;
  }

  const namespace = keyNs ?? (dependsOnContext ? contextNs?.name : undefined);
  if (namespace && !isString(namespace)) {
    // namespace is dynamic
    if (namespace === contextNs?.name) {
      // namespace coming from context
      warnings.push({ line, warning: 'W_UNRESOLVABLE_NAMESPACE' });
    } else {
      // namespace is directly on key
      warnings.push({
        line,
        warning: 'W_DYNAMIC_NAMESPACE',
      });
    }
    return;
  }

  if (defaultValue !== undefined && !isString(defaultValue)) {
    // this is just warning, we can still extract
    warnings.push({ line, warning: 'W_DYNAMIC_DEFAULT_VALUE' });
  }

  keys.push({
    line,
    keyName: extractString(keyName)!,
    namespace: extractString(namespace) ?? defaultNamespace,
    defaultValue: extractString(defaultValue),
  });
}

function reportNs(context: Context, node: NamespaceInfoNode) {
  const { warnings } = context;
  const { line, name } = node;

  if (name && !isString(name)) {
    warnings.push({ line, warning: 'W_DYNAMIC_NAMESPACE' });
  }
}

function reportGeneral(
  context: Context,
  node: GeneralNode | undefined,
  contextNs: NamespaceInfoNode | undefined
) {
  if (!node) {
    return;
  }
  if (node.type === 'expr' || node.type === 'array') {
    let namespace = contextNs;
    for (const item of node.values) {
      if (item.type === 'nsInfo') {
        const oldNamespace = namespace;
        if (!shouldBeIgnored(context, item.line)) {
          reportNs(context, item);
          namespace = item;
        }

        // there might be nested stuff
        reportGeneral(context, item.name, oldNamespace);
        for (const i of item.values) {
          reportGeneral(context, i, oldNamespace);
        }
      } else {
        reportGeneral(context, item, namespace);
      }
    }
  } else if (node.type === 'keyInfo') {
    reportKey(context, node, contextNs);

    // there might be nested stuff
    reportGeneral(context, node.keyName, contextNs);
    reportGeneral(context, node.namespace, contextNs);
    reportGeneral(context, node.defaultValue, contextNs);

    for (const i of node.values) {
      reportGeneral(context, i, contextNs);
    }
  } else if (node.type === 'dict') {
    for (const item of Object.values(node.value)) {
      reportGeneral(context, item, contextNs);
    }
    // go through values with unknown keynames
    for (const item of node.unknown) {
      reportGeneral(context, item, contextNs);
    }
  }
}

type GenerateReportProps = {
  node: GeneralNode;
  comments: MagicCommentEvent[];
  contextNs?: NamespaceInfoNode;
  options: ExtractOptions;
};

export function generateReport({
  node,
  contextNs,
  comments,
  options,
}: GenerateReportProps): Report {
  const commentMap: Map<number, MagicCommentEvent> = new Map();
  comments.forEach((item) => {
    commentMap.set(item.line, item);
  });
  const unusedComments = new Set(comments);
  const context: Context = {
    commentMap,
    unusedComments,
    options,
    keys: [],
    warnings: [],
  };

  reportGeneral(context, node, contextNs);

  unusedComments.forEach((value) => {
    if (value.type === 'WARNING') {
      context.warnings.push({ line: value.line, warning: value.kind });
    } else if (value.type === 'MAGIC_COMMENT' && value.kind === 'key') {
      context.keys.push({
        keyName: value.keyName,
        namespace: value.namespace,
        defaultValue: value.defaultValue,
        line: value.line,
      });
    } else if (value.type === 'MAGIC_COMMENT' && value.kind === 'ignore') {
      context.warnings.push({ line: value.line, warning: 'W_UNUSED_IGNORE' });
    }
  });

  return { keys: context.keys, warnings: context.warnings };
}
