import { relative } from 'path';

export type WarningMessage = { name: string; description: string };

// Note: @ are followed by a zero-width-space to ensure they do not cause mentions on GitHub.
export const WarningMessages: Record<string, WarningMessage> = {
  W_DYNAMIC_KEY: {
    name: 'Dynamic key',
    description:
      'The key not static and cannot be extracted automatically. This key will be ignored.\n\nUse @tolgee-key or @tolgee-ignore to suppress this warning.',
  },
  W_DYNAMIC_NAMESPACE: {
    name: 'Dynamic namespace',
    description:
      'The namespace for this key is not static and cannot be extracted automatically. This key will be ignored.\n\nUse @tolgee-key or @tolgee-ignore to suppress this warning.',
  },
  W_DYNAMIC_DEFAULT_VALUE: {
    name: 'Dynamic default value',
    description:
      'The default value for this key is not static and cannot be extracted automatically.\n\nUse @tolgee-key or @tolgee-ignore to suppress this warning.',
  },
  W_DYNAMIC_OPTIONS: {
    name: 'Dynamic options',
    description:
      'The options for this key are not static and cannot be extracted automatically. This key will be ignored.\n\nUse @tolgee-key or @tolgee-ignore to suppress this warning.',
  },
  W_UNRESOLVABLE_NAMESPACE: {
    name: 'Cannot resolve namespace',
    description:
      'The namespace for this key cannot be resolved. This key will be ignored.\n\nUse @tolgee-key or @tolgee-ignore to suppress this warning.',
  },
  W_UNUSED_IGNORE: {
    name: 'Unused ignore directive',
    description: 'This directive is unused.',
  },
  W_MALFORMED_KEY_OVERRIDE: {
    name: 'Malformed key override',
    description: "Couldn't parse the JSON5 object.",
  },
  W_INVALID_KEY_OVERRIDE: {
    name: 'Invalid key override',
    description:
      'The `key` must be present, and the `key`, `ns`, and `defaultValue` must be strings.',
  },
};

export function emitGitHubWarning(warning: string, file: string, line: number) {
  if (!process.env.GITHUB_ACTIONS) return;

  file = relative(process.env.GITHUB_WORKSPACE ?? process.cwd(), file);

  if (warning in WarningMessages) {
    const { name, description } =
      WarningMessages[warning as keyof typeof WarningMessages];

    const encodedDescription = description
      .replaceAll('%', '%25')
      .replaceAll('\r', '%0D')
      .replaceAll('\n', '%0A')
      .replaceAll(':', '%3A')
      .replaceAll(',', '%2C')
      .replaceAll('@', '@​'); // This has a ZWS; preventing mentions

    console.log(
      `::warning file=${file},line=${line},title=${name}::${encodedDescription}`
    );
    return;
  }

  console.log(`::warning file=${file},line=${line}::${warning}`);
}
