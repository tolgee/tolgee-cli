import { components } from '#cli/client/internal/schema.generated.js';
import en from '#tests/__fixtures__/fullLanguageNamesProject/en-GB.json';
import fr from '#tests/__fixtures__/fullLanguageNamesProject/fr-FR.json';

const keys = Object.keys(en) as Array<keyof typeof en>;
export const FULL_LANGUAGE_NAMES_PROJECT: components['schemas']['SingleStepImportResolvableRequest'] =
  {
    keys: keys.map((name) => ({
      name,
      translations: {
        'en-GB': { text: en[name] },
        'fr-FR': { text: fr[name] },
      },
    })),
  };
