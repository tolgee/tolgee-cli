import { components } from '../../../../client/internal/schema.generated.js';
import en from '../../../__fixtures__/nestedKeysProject/en.json';
import fr from '../../../__fixtures__/nestedKeysProject/fr.json';

export const NESTED_KEYS_PROJECT: components['schemas']['ImportKeysResolvableDto'] =
  {
    keys: Object.keys(en).map((name) => ({
      name,
      translations: {
        en: { text: en[name], resolution: 'NEW' },
        fr: { text: fr[name], resolution: 'NEW' },
      },
    })),
  };
