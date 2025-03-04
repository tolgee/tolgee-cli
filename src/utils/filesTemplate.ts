import { glob } from 'tinyglobby';
import { exitWithError } from './logger.js';
import { FileMatch } from '../schema.js';

const GLOB_EXISTING_DOUBLE_STAR = /(\*\*)/g;
const GLOB_EXISTING_STAR = /(\*)/g;
const GLOB_EXISTING_ENUM = /\{([^}]*?,[^}]*?)\}/g;

const PLACEHOLDER_DOUBLE_STAR = '__double_star';
const PLACEHOLDER_STAR = '__star';
const PLACEHOLDER_ENUM_PREFIX = '__enum:';

export class FileMatcherException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

function splitToParts(template: string) {
  return template.split(/(\{.*?\})/g).filter(Boolean);
}

function getVariableName(part: string) {
  if (part.startsWith('{') && part.endsWith('}')) {
    return part.substring(1, part.length - 1).trim();
  }
  return false;
}

export function sanitizeTemplate(template: string) {
  let value = template;
  const matchedEnums = [...(value.match(GLOB_EXISTING_ENUM)?.values() || [])];
  matchedEnums.forEach((val) => {
    value = value.replace(
      val,
      `{${PLACEHOLDER_ENUM_PREFIX}${getVariableName(val)}}`
    );
  });
  value = value.replaceAll(
    GLOB_EXISTING_DOUBLE_STAR,
    '{' + PLACEHOLDER_DOUBLE_STAR + '}'
  );
  value = value.replaceAll(GLOB_EXISTING_STAR, '{' + PLACEHOLDER_STAR + '}');
  return value;
}

export function getFileMatcher(file: string, template: string) {
  let fileName = file;
  const allVariables: Record<string, string> = {};
  const templateParts = splitToParts(template);
  for (const [i, part] of templateParts.entries()) {
    const variable = getVariableName(part);
    if (!variable) {
      if (fileName.startsWith(part)) {
        fileName = fileName.substring(part.length);
      } else {
        throw new FileMatcherException(`Unexpected part "${part}"`);
      }
    } else {
      const next = templateParts[i + 1];
      if (next) {
        const variableEnd = fileName.indexOf(next);
        if (getVariableName(next) || variableEnd === -1) {
          throw new FileMatcherException(
            `Can't have two variables without separator (${part} + ${next})`
          );
        } else {
          allVariables[variable] = fileName.substring(0, variableEnd);
          fileName = fileName.substring(variableEnd);
        }
      } else {
        allVariables[variable] = fileName;
      }
    }
  }

  const result: FileMatch = { path: file };
  for (const [variable, value] of Object.entries(allVariables)) {
    if (variable === 'languageTag') {
      result.language = value;
    } else if (variable === 'snakeLanguageTag') {
      result.language = value.replaceAll('_', '-');
    } else if (variable === 'androidLanguageTag') {
      if (value[3] === 'r') {
        result.language =
          value.substring(0, 3) + value.substring(4, value.length);
      } else {
        result.language = value;
      }
    } else if (variable === 'namespace') {
      result.namespace = value;
    } else if (
      variable !== 'extension' &&
      ![PLACEHOLDER_STAR, PLACEHOLDER_DOUBLE_STAR].includes(variable) &&
      !variable.startsWith(PLACEHOLDER_ENUM_PREFIX)
    ) {
      throw new FileMatcherException(`Unknown variable "${variable}"`);
    }
  }
  return result;
}

export function getGlobPattern(template: string) {
  let value = template.replaceAll(GLOB_EXISTING_DOUBLE_STAR, '{__double_star}');
  value = value.replaceAll(GLOB_EXISTING_STAR, '{__star}');
  const parts = splitToParts(value);
  const globPattern = parts
    .map((part) => {
      const variableName = getVariableName(part);
      if (variableName) {
        if (variableName === PLACEHOLDER_DOUBLE_STAR) {
          return '**';
        } else if (variableName.startsWith(PLACEHOLDER_ENUM_PREFIX)) {
          return (
            '{' + variableName.substring(PLACEHOLDER_ENUM_PREFIX.length) + '}'
          );
        } else {
          return '*';
        }
      } else {
        return part;
      }
    })
    .join('');

  return globPattern;
}

export async function findFilesByTemplate(
  template: string
): Promise<FileMatch[]> {
  try {
    const sanitized = sanitizeTemplate(template);
    const globPattern = getGlobPattern(sanitized);
    const files = await glob(globPattern, { onlyFiles: true, absolute: true });
    return files.map((file) => {
      return getFileMatcher(file, sanitized);
    });
  } catch (e) {
    if (e instanceof FileMatcherException) {
      exitWithError(e.message + ` in template ${template}`);
    } else {
      throw e;
    }
  }
}
