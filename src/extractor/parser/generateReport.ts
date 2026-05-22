import { MagicCommentEvent, MagicKeyComment } from './extractComment.js';
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

function commentKeyInfoOnLine(
  context: Context,
  line: number
): ExtractedKey | undefined {
  const commentAtLine = context.commentMap.get(line - 1);
  const isKeyInfo =
    commentAtLine?.type === 'MAGIC_COMMENT' && commentAtLine.kind === 'key';
  if (isKeyInfo) {
    context.unusedComments.delete(commentAtLine);
    return keyInfoFromComment(context, commentAtLine);
  }
  return undefined;
}

function keyInfoFromComment(context: Context, info: MagicKeyComment) {
  return {
    keyName: info.keyName,
    namespace: info.namespace ?? context.options.defaultNamespace,
    defaultValue: info.defaultValue,
    line: info.line,
  };
}

function reportKey(
  context: Context,
  node: KeyInfoNode,
  contextNs: NamespaceInfoNode | undefined,
  nsByAlias: Map<string, NamespaceInfoNode>
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
    alias,
  } = node;
  // Prefer the nsInfo bound to the same destructured alias as the call
  // site, so multiple `useTranslate(...)` declarations in one scope route
  // their keys to the right namespace instead of all collapsing onto the
  // most recently emitted nsInfo.
  const aliasContextNs = alias ? nsByAlias.get(alias) : undefined;
  const effectiveContextNs = aliasContextNs ?? contextNs;

  if (shouldBeIgnored(context, line)) {
    return { keys, warnings };
  }

  const overrideInfo = commentKeyInfoOnLine(context, node.line);

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

  if (dependsOnContext && !effectiveContextNs && !keyNs && strictNamespace) {
    // there is no namespace source so namespace is ambiguous
    warnings.push({ line, warning: 'W_MISSING_T_SOURCE' });
    return;
  }

  if (optionsDynamic && strictNamespace) {
    // options of the key can't be analyzed, so again ambiguous namespace
    warnings.push({ line, warning: 'W_DYNAMIC_OPTIONS' });
    return;
  }

  const namespace =
    keyNs ?? (dependsOnContext ? effectiveContextNs?.name : undefined);
  if (namespace && !isString(namespace)) {
    // namespace is dynamic
    if (namespace === effectiveContextNs?.name) {
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
  contextNs: NamespaceInfoNode | undefined,
  nsByAlias: Map<string, NamespaceInfoNode>
) {
  if (!node) {
    return;
  }
  if (node.type === 'expr' || node.type === 'array') {
    let namespace = contextNs;
    // Per-alias tracking lives in a child scope so cousin branches don't
    // see each other's bindings, but later siblings within the same expr
    // do — same shape as the existing `namespace` walker.
    const childNsByAlias = new Map(nsByAlias);
    for (const item of node.values) {
      if (item.type === 'nsInfo') {
        const oldNamespace = namespace;
        if (!shouldBeIgnored(context, item.line)) {
          reportNs(context, item);
          namespace = item;
          if (item.alias) {
            childNsByAlias.set(item.alias, item);
          }
        }

        // there might be nested stuff
        reportGeneral(context, item.name, oldNamespace, childNsByAlias);
        for (const i of item.values) {
          reportGeneral(context, i, oldNamespace, childNsByAlias);
        }
      } else {
        reportGeneral(context, item, namespace, childNsByAlias);
      }
    }
  } else if (node.type === 'keyInfo') {
    reportKey(context, node, contextNs, nsByAlias);

    // there might be nested stuff
    reportGeneral(context, node.keyName, contextNs, nsByAlias);
    reportGeneral(context, node.namespace, contextNs, nsByAlias);
    reportGeneral(context, node.defaultValue, contextNs, nsByAlias);

    for (const i of node.values) {
      reportGeneral(context, i, contextNs, nsByAlias);
    }
  } else if (node.type === 'dict') {
    for (const item of Object.values(node.value)) {
      reportGeneral(context, item, contextNs, nsByAlias);
    }
    // go through values with unknown keynames
    for (const item of node.unknown) {
      reportGeneral(context, item, contextNs, nsByAlias);
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

  reportGeneral(context, node, contextNs, new Map());

  unusedComments.forEach((value) => {
    if (value.type === 'WARNING') {
      context.warnings.push({ line: value.line, warning: value.kind });
    } else if (value.type === 'MAGIC_COMMENT' && value.kind === 'key') {
      context.keys.push(keyInfoFromComment(context, value));
    } else if (value.type === 'MAGIC_COMMENT' && value.kind === 'ignore') {
      context.warnings.push({ line: value.line, warning: 'W_UNUSED_IGNORE' });
    }
  });

  return { keys: context.keys, warnings: context.warnings };
}
