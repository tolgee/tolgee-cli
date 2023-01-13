import type { ExtractionResult } from '.';
import { relative } from 'path';

export type WarningMessage = { name: string; description: string };

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

/**
 * Dumps warnings emitted during an extraction to stdout, with GitHub integration, and counts them.
 *
 * @param extractionResult Extraction result to dump warnings from.
 * @returns Count of emitted warnings in the extraction.
 */
export function dumpWarnings(extractionResult: ExtractionResult) {
  let warningCount = 0;

  for (const [file, { warnings }] of extractionResult.entries()) {
    if (warnings.length) {
      if (!warningCount) {
        console.error('Warnings were emitted during extraction.');
      }

      console.error(file);
      for (const warning of warnings) {
        const warnText =
          warning.warning in WarningMessages
            ? WarningMessages[warning.warning].name
            : warning.warning;

        console.error('\tline %d: %s', warning.line, warnText);
        emitGitHubWarning(warning.warning, file, warning.line);
      }

      warningCount += warnings.length;
    }
  }

  if (warningCount) {
    console.error(
      'Total: %d warning%s',
      warningCount,
      warningCount === 1 ? '' : 's'
    );
  }

  return warningCount;
}

// TODO: Revisit this function and turn it into an actual GitHub Action Annotation?
// https://docs.github.com/en/rest/checks/runs?apiVersion=2022-11-28#update-a-check-run
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
