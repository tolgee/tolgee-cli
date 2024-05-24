import { components } from '../../../../src/client/internal/schema.generated';
import en from '../../../__fixtures__/tolgeeImportData/test2/en.json';
import fr from '../../../__fixtures__/tolgeeImportData/test2/fr.json';

export const PROJECT_2: components['schemas']['ImportKeysResolvableDto'] = {
  keys: Object.keys(en).map((name) => ({
    name,
    translations: {
      en: { text: en[name], resolution: 'NEW' },
      fr: { text: fr[name], resolution: 'NEW' },
    },
  })),
};
