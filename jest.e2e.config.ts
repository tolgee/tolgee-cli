import type { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  testEnvironment: 'node',
  displayName: 'E2E',
  testMatch: ['<rootDir>/test/e2e/**/*.(spec|test).[jt]s?(x)'],

  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      { useESM: true, tsconfig: './tsconfig.test.json' },
    ],
  },

  // Tests may update their global env (e.g. Tolgee properties) and cannot be concurrent.
  maxConcurrency: 1,
  testTimeout: 30e3,
  slowTestThreshold: 60e3,
  globalSetup: '<rootDir>/test/e2e/__internal__/setup.ts',
};
