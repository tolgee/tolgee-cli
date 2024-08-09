import { components } from '#cli/client/internal/schema.generated.js';

export const languagesTestData: components['schemas']['LanguageRequest'][] = [
  {
    name: 'English',
    originalName: 'English',
    tag: 'en',
    flagEmoji: '🇬🇧',
  },
  {
    name: 'French',
    originalName: 'French',
    tag: 'fr',
    flagEmoji: '🇫🇷',
  },
];
