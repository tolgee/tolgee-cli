import {
  sanitizeTemplate,
  getGlobPattern,
  getFileMatcher,
} from '#cli/utils/filesTemplate.js';

describe('filesTemplate', () => {
  it('supports languageTag variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{languageTag}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.json');
    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });
  });

  it('supports snakeLanguageTag variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{snakeLanguageTag}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.json');
    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });

    expect(getFileMatcher('./i18n/en_US.json', sanitized)).toEqual({
      path: './i18n/en_US.json',
      language: 'en-US',
    });
  });

  it('supports snakeLanguageTag variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{snakeLanguageTag}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.json');
    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });

    expect(getFileMatcher('./i18n/en_US.json', sanitized)).toEqual({
      path: './i18n/en_US.json',
      language: 'en-US',
    });
  });

  it('supports androidLanguageTag variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{androidLanguageTag}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.json');

    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });

    expect(getFileMatcher('./i18n/en-rUS.json', sanitized)).toEqual({
      path: './i18n/en-rUS.json',
      language: 'en-US',
    });
  });

  it('supports languageTag and namespace variables', () => {
    const sanitized = sanitizeTemplate('./i18n/{namespace}/{languageTag}.json');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*/*.json');
    expect(getFileMatcher('./i18n/common/en.json', sanitized)).toEqual({
      path: './i18n/common/en.json',
      language: 'en',
      namespace: 'common',
    });
  });

  it('supports combination with a wildcard *', () => {
    const sanitized = sanitizeTemplate('./i18n/{namespace}/{languageTag}.*');
    expect(sanitized).toEqual('./i18n/{namespace}/{languageTag}.{__star}');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*/*.*');
    expect(getFileMatcher('./i18n/common/en.json', sanitized)).toEqual({
      path: './i18n/common/en.json',
      language: 'en',
      namespace: 'common',
    });
  });

  it('supports combination with a wildcard **', () => {
    const sanitized = sanitizeTemplate('./**/{namespace}/{languageTag}.*');
    expect(sanitized).toEqual(
      './{__double_star}/{namespace}/{languageTag}.{__star}'
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
    const sanitized = sanitizeTemplate('./i18n/{languageTag}.{json,yaml}');
    expect(sanitized).toEqual('./i18n/{languageTag}.{__enum:json,yaml}');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.{json,yaml}');
    expect(getFileMatcher('./i18n/en.json', sanitized)).toEqual({
      path: './i18n/en.json',
      language: 'en',
    });
  });

  it('ignores {extension} variable', () => {
    const sanitized = sanitizeTemplate('./i18n/{languageTag}.{extension}');
    expect(sanitized).toEqual('./i18n/{languageTag}.{extension}');
    const globPattern = getGlobPattern(sanitized);
    expect(globPattern).toEqual('./i18n/*.*');
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
    const sanitized = sanitizeTemplate('./i18n/{languageTag}*');
    expect(sanitized).toEqual('./i18n/{languageTag}{__star}');
    expect(() => getFileMatcher('./i18n/common/en.json', sanitized)).toThrow(
      `Can't have two variables without separator ({languageTag} + {__star})`
    );
  });
});
