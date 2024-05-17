import { components } from '../client/internal/schema.generated.js';
import { Schema } from '../schema.js';

type FormatResult = {
  format: components['schemas']['ExportParams']['format'];
  messageFormat: components['schemas']['ExportParams']['messageFormat'];
};

export const mapExportFormat = (format: Schema['format']): FormatResult => {
  switch (format) {
    case 'ANDROID_XML':
      return { format: 'ANDROID_XML', messageFormat: 'JAVA_STRING_FORMAT' };
    case 'APPLE_STRINGS':
      return {
        format: 'APPLE_STRINGS_STRINGSDICT',
        messageFormat: 'APPLE_SPRINTF',
      };
    case 'APPLE_XLIFF':
      return { format: 'APPLE_XLIFF', messageFormat: 'APPLE_SPRINTF' };
    case 'FLUTTER_ARB':
      return { format: 'FLUTTER_ARB', messageFormat: 'ICU' };
    case 'JSON_C':
      return { format: 'JSON', messageFormat: 'C_SPRINTF' };
    case 'JSON_ICU':
      return { format: 'JSON', messageFormat: 'ICU' };
    case 'JSON_JAVA':
      return { format: 'JSON', messageFormat: 'JAVA_STRING_FORMAT' };
    case 'JSON_PHP':
      return { format: 'JSON', messageFormat: 'PHP_SPRINTF' };
    case 'JSON_RUBY':
      return { format: 'JSON', messageFormat: 'RUBY_SPRINTF' };
    case 'JSON_TOLGEE':
      return { format: 'JSON_TOLGEE', messageFormat: 'ICU' };
    case 'PO_C':
      return { format: 'PO', messageFormat: 'C_SPRINTF' };
    case 'PO_ICU':
      return { format: 'PO', messageFormat: 'ICU' };
    case 'PO_JAVA':
      return { format: 'PO', messageFormat: 'JAVA_STRING_FORMAT' };
    case 'PO_PHP':
      return { format: 'PO', messageFormat: 'PHP_SPRINTF' };
    case 'PO_RUBY':
      return { format: 'PO', messageFormat: 'RUBY_SPRINTF' };
    case 'PROPERTIES_ICU':
      return {
        format: 'PROPERTIES',
        messageFormat: 'ICU',
      };
    case 'PROPERTIES_JAVA':
      return { format: 'PROPERTIES', messageFormat: 'JAVA_STRING_FORMAT' };
    case 'XLIFF_ICU':
      return { format: 'XLIFF', messageFormat: 'ICU' };
    case 'XLIFF_JAVA':
      return { format: 'XLIFF', messageFormat: 'JAVA_STRING_FORMAT' };
    case 'XLIFF_PHP':
      return { format: 'XLIFF', messageFormat: 'PHP_SPRINTF' };
    case 'XLIFF_RUBY':
      return { format: 'XLIFF', messageFormat: 'RUBY_SPRINTF' };
    case 'YAML_ICU':
      return { format: 'YAML', messageFormat: 'ICU' };
    case 'YAML_JAVA':
      return { format: 'YAML', messageFormat: 'JAVA_STRING_FORMAT' };
    case 'YAML_PHP':
      return { format: 'YAML', messageFormat: 'PHP_SPRINTF' };
    case 'YAML_RUBY':
      return { format: 'YAML_RUBY', messageFormat: 'RUBY_SPRINTF' };
    case undefined:
      return { format: 'JSON_TOLGEE', messageFormat: 'ICU' };
  }
};
