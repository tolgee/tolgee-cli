import { components } from '../../../../client/internal/schema.generated.js';
import en from '../../../__fixtures__/fullLanguageNamesProject/en-GB.json';
import fr from '../../../__fixtures__/fullLanguageNamesProject/fr-FR.json';

export const FULL_LANGUAGE_NAMES_PROJECT: components['schemas']['ImportKeysResolvableDto'] =
  {
    keys: Object.keys(en).map((name) => ({
      name,
      translations: {
        'en-GB': { text: en[name], resolution: 'NEW' },
        'fr-FR': { text: fr[name], resolution: 'NEW' },
      },
    })),
  };
