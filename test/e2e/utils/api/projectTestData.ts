import { components } from '../../../../src/client/internal/schema.generated';

export const projectTestData: components['schemas']['ImportKeysResolvableDto'] =
  {
    keys: [
      {
        name: 'controller',
        translations: {
          en: { text: 'Controller', resolution: 'NEW' },
          cs: { text: 'Kontroler', resolution: 'NEW' },
        },
      },
      {
        name: 'desk',
        translations: {
          en: { text: 'Desk', resolution: 'NEW' },
          cs: { text: 'Lavice', resolution: 'NEW' },
        },
      },
      {
        name: 'keyboard',
        translations: {
          en: { text: 'Keyboard', resolution: 'NEW' },
          cs: { text: 'Klávesnice', resolution: 'NEW' },
        },
      },
      {
        name: 'mouse',
        translations: {
          en: { text: 'Mouse', resolution: 'NEW' },
          cs: { text: 'Myš', resolution: 'NEW' },
        },
      },
      {
        name: 'screen',
        translations: {
          en: { text: 'Screen', resolution: 'NEW' },
          cs: { text: 'Obrazovka', resolution: 'NEW' },
        },
      },
    ],
  };
