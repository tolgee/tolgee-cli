import { components } from '#cli/client/internal/schema.generated.js';
import en from '#tests/__fixtures__/nestedArrayKeysProject/en.json';

const keys = Object.keys(en) as Array<keyof typeof en>;
export const NESTED_ARRAY_KEYS_PROJECT: components['schemas']['SingleStepImportResolvableRequest'] =
  {
    keys: keys.map((name) => ({
      name,
      translations: {
        en: { text: en[name] },
      },
    })),
  };
