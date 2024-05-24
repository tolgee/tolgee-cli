import { components } from '../../../../src/client/internal/schema.generated';

export const languagesTestData: components['schemas']['LanguageRequest'][] = [
  {
    name: 'English',
    originalName: 'English',
    tag: 'en',
    flagEmoji: '🇬🇧',
  },
  {
    name: 'Czech',
    originalName: 'Česky',
    tag: 'cs',
    flagEmoji: '🇨🇿',
  },
];
