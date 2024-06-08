import { ArrayNode, DictNode, GeneralNode } from '../types.js';

function getCombinedOptions(
  {
    ns,
    noWrap,
    orEmpty,
    params,
    language,
    ...rest
  }: Record<string, GeneralNode>,
  line: number
): Record<string, GeneralNode> {
  const options = {
    ns: ns!,
    noWrap: noWrap!,
    orEmpty: orEmpty!,
    language: language!,
  };
  return {
    ...options,
    params: {
      type: 'dict',
      line,
      value: {
        ...rest,
      },
      unknown: [],
    },
  };
}

export const getTranslateProps = (node: ArrayNode) => {
  const [keyOrProps, ...params] = node.values;
  let result: DictNode = {
    type: 'dict',
    line: node.line,
    value: {},
    unknown: [],
  };
  let options: GeneralNode | undefined = undefined;
  if (keyOrProps?.type === 'dict') {
    result = keyOrProps;
  } else {
    result.value.key = keyOrProps;
    if (params[0]?.type === 'primitive' || params.length >= 2) {
      result.value.defaultValue = params[0];
      options = params[1];
    } else {
      options = params[0];
    }
  }

  let optionsDynamic = false;
  if (options?.type === 'dict') {
    result.value = {
      ...getCombinedOptions(options.value, options.line),
      ...result.value,
    };
    result.unknown.push(...options.unknown);
  } else if (options) {
    optionsDynamic = true;
  }

  return { result, optionsDynamic };
};
