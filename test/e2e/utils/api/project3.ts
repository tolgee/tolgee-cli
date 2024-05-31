import { components } from '../../../../src/client/internal/schema.generated';
import en from '../../../__fixtures__/tolgeeImportData/test3/en.json';
import fr from '../../../__fixtures__/tolgeeImportData/test3/fr.json';

import enDrinks from '../../../__fixtures__/tolgeeImportData/test3/drinks/en.json';
import frDrinks from '../../../__fixtures__/tolgeeImportData/test3/drinks/fr.json';

import enFood from '../../../__fixtures__/tolgeeImportData/test3/food/en.json';
import frFood from '../../../__fixtures__/tolgeeImportData/test3/food/fr.json';

type ImportKeysResolvableItemDto =
  components['schemas']['ImportKeysResolvableItemDto'];

export const PROJECT_3: components['schemas']['ImportKeysResolvableDto'] = {
  keys: [
    ...Object.keys(en).map(
      (name) =>
        ({
          name,
          translations: {
            en: { text: en[name], resolution: 'NEW' },
            fr: { text: fr[name], resolution: 'NEW' },
          },
        }) satisfies ImportKeysResolvableItemDto
    ),
    ...Object.keys(enDrinks).map(
      (name) =>
        ({
          name,
          namespace: 'drinks',
          translations: {
            en: { text: enDrinks[name], resolution: 'NEW' },
            fr: { text: frDrinks[name], resolution: 'NEW' },
          },
        }) satisfies ImportKeysResolvableItemDto
    ),
    ...Object.keys(enFood).map(
      (name) =>
        ({
          name,
          namespace: 'food',
          translations: {
            en: { text: enFood[name], resolution: 'NEW' },
            fr: { text: frFood[name], resolution: 'NEW' },
          },
        }) satisfies ImportKeysResolvableItemDto
    ),
  ],
};
