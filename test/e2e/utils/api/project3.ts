import { components } from '#cli/client/internal/schema.generated.js';
import en from '#tests/__fixtures__/tolgeeImportData/test3/en.json';
import fr from '#tests/__fixtures__/tolgeeImportData/test3/fr.json';

import enDrinks from '#tests/__fixtures__/tolgeeImportData/test3/drinks/en.json';
import frDrinks from '#tests/__fixtures__/tolgeeImportData/test3/drinks/fr.json';

import enFood from '#tests/__fixtures__/tolgeeImportData/test3/food/en.json';
import frFood from '#tests/__fixtures__/tolgeeImportData/test3/food/fr.json';

type SingleStepImportResolvableItemRequest =
  components['schemas']['SingleStepImportResolvableItemRequest'];

const keys = Object.keys(en) as Array<keyof typeof en>;
const keysDrinks = Object.keys(enDrinks) as Array<keyof typeof enDrinks>;
const keysFood = Object.keys(enFood) as Array<keyof typeof enFood>;

export const PROJECT_3: components['schemas']['SingleStepImportResolvableRequest'] =
  {
    keys: [
      ...keys.map(
        (name) =>
          ({
            name,
            translations: {
              en: { text: en[name] },
              fr: { text: fr[name] },
            },
          }) satisfies SingleStepImportResolvableItemRequest
      ),
      ...keysDrinks.map(
        (name) =>
          ({
            name,
            namespace: 'drinks',
            translations: {
              en: { text: enDrinks[name] },
              fr: { text: frDrinks[name] },
            },
          }) satisfies SingleStepImportResolvableItemRequest
      ),
      ...keysFood.map(
        (name) =>
          ({
            name,
            namespace: 'food',
            translations: {
              en: { text: enFood[name] },
              fr: { text: frFood[name] },
            },
          }) satisfies SingleStepImportResolvableItemRequest
      ),
    ],
  };
