import { components } from '../../../../client/internal/schema.generated.js';
import en from '../../../__fixtures__/tolgeeImportData/test1/en.json';
import fr from '../../../__fixtures__/tolgeeImportData/test1/fr.json';

export const PROJECT_1: components['schemas']['ImportKeysResolvableDto'] = {
  keys: Object.keys(en).map((name) => ({
    name,
    translations: {
      en: { text: en[name], resolution: 'NEW' },
      fr: { text: fr[name], resolution: 'NEW' },
    },
  })),
};
