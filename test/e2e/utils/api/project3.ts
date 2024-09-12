import { components } from '#cli/client/internal/schema.generated.js';
import en from '#tests/__fixtures__/tolgeeImportData/test3/en.json';
import fr from '#tests/__fixtures__/tolgeeImportData/test3/fr.json';

import enDrinks from '#tests/__fixtures__/tolgeeImportData/test3/drinks/en.json';
import frDrinks from '#tests/__fixtures__/tolgeeImportData/test3/drinks/fr.json';

import enFood from '#tests/__fixtures__/tolgeeImportData/test3/food/en.json';
import frFood from '#tests/__fixtures__/tolgeeImportData/test3/food/fr.json';

type ImportKeysResolvableItemDto =
  components['schemas']['ImportKeysResolvableItemDto'];

const keys = Object.keys(en) as Array<keyof typeof en>;
const keysDrinks = Object.keys(enDrinks) as Array<keyof typeof enDrinks>;
const keysFood = Object.keys(enFood) as Array<keyof typeof enFood>;

export const PROJECT_3: components['schemas']['ImportKeysResolvableDto'] = {
  keys: [
    ...keys.map(
      (name) =>
        ({
          name,
          translations: {
            en: { text: en[name], resolution: 'NEW' },
            fr: { text: fr[name], resolution: 'NEW' },
          },
        }) satisfies ImportKeysResolvableItemDto
    ),
    ...keysDrinks.map(
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
    ...keysFood.map(
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
