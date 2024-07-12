import { components } from '../../../../client/internal/schema.generated.js';
import en from '../../../__fixtures__/nestedArrayKeysProject/en.json';

export const NESTED_ARRAY_KEYS_PROJECT: components['schemas']['ImportKeysResolvableDto'] =
  {
    keys: Object.keys(en).map((name) => ({
      name,
      translations: {
        en: { text: en[name], resolution: 'NEW' },
      },
    })),
  };
