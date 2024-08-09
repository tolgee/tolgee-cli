import { components } from '#cli/client/internal/schema.generated.js';
import en from '#tests/__fixtures__/tolgeeImportData/test2/en.json';
import fr from '#tests/__fixtures__/tolgeeImportData/test2/fr.json';

const keys = Object.keys(en) as Array<keyof typeof en>;
export const PROJECT_2: components['schemas']['ImportKeysResolvableDto'] = {
  keys: keys.map((name) => ({
    name,
    translations: {
      en: { text: en[name], resolution: 'NEW' },
      fr: { text: fr[name], resolution: 'NEW' },
    },
  })),
};
