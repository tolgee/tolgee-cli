import {
  sanitizeTemplate,
  getGlobPattern,
  getFileMatcher,
} from '#cli/utils/filesTemplate.js';

describe('filesTemplate', () => {
  it('supports language variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{language}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.json');
    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });
  });

  it('supports language and namespace variables', () => {
    const sanitized = sanitizeTemplate('./i18n/{namespace}/{language}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*/*.json');
    expect(getFileMatcher('./i18n/common/en.json', sanitized)).toEqual({
      path: './i18n/common/en.json',
      language: 'en',
      namespace: 'common',
    });
  });

  it('supports combination with a wildcard *', () => {
    const sanitized = sanitizeTemplate('./i18n/{namespace}/{language}.*');
    expect(sanitized).toEqual('./i18n/{namespace}/{language}.{__star}');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*/*.*');
    expect(getFileMatcher('./i18n/common/en.json', sanitized)).toEqual({
      path: './i18n/common/en.json',
      language: 'en',
      namespace: 'common',
    });
  });

  it('supports combination with a wildcard **', () => {
    const sanitized = sanitizeTemplate('./**/{namespace}/{language}.*');
    expect(sanitized).toEqual(
      './{__double_star}/{namespace}/{language}.{__star}'
    );
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./**/*/*.*');
    expect(getFileMatcher('./i18n/common/en.json', sanitized)).toEqual({
      path: './i18n/common/en.json',
      language: 'en',
      namespace: 'common',
    });
  });

  it('supports enum wildcards', () => {
    const sanitized = sanitizeTemplate('./i18n/{language}.{json,yaml}');
    expect(sanitized).toEqual('./i18n/{language}.{__enum:json,yaml}');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.{json,yaml}');
    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });
  });

  it('throws error on unknown variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{unknown}.*');
    expect(sanitized).toEqual('./i18n/{unknown}.{__star}');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.*');
    expect(() => getFileMatcher('./i18n/common/en.json', sanitized)).toThrow(
      'Unknown variable "unknown"'
    );
  });

  it('throws error on invalid template', () => {
    const sanitized = sanitizeTemplate('./i18n/{language}*');
    expect(sanitized).toEqual('./i18n/{language}{__star}');
    expect(() => getFileMatcher('./i18n/common/en.json', sanitized)).toThrow(
      `Can't have two variables without separator ({language} + {__star})`
    );
  });
});
