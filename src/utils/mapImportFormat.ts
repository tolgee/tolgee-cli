import { InvalidArgumentError } from 'commander';
import { components } from '../client/internal/schema.generated.js';
import { Schema } from '../schema.js';

type FormatResult = components['schemas']['ImportFileMapping']['format'];

export const mapImportFormat = (
  format: Schema['format'],
  extension: string
): FormatResult => {
  switch (format) {
    case 'APPLE_STRINGS': {
      // apple separates translations to two separate files
      // we keep it under one format for the cli
      if (extension === '.stringsdict') {
        return 'STRINGSDICT';
      } else {
        return 'STRINGS';
      }
    }
    case 'JSON_TOLGEE':
      return 'JSON_ICU';
    case 'ANDROID_SDK':
      throw new InvalidArgumentError('Importing files in ANDROID_SDK format is not supported.');
    case 'APPLE_SDK':
      throw new InvalidArgumentError('Importing files in APPLE_SDK format is not supported.');
    default:
      return format ?? 'JSON_ICU';
  }
};
