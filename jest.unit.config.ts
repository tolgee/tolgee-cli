import type { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  testEnvironment: 'node',
  displayName: 'Unit',
  testMatch: ['<rootDir>/test/unit/**/*.(spec|test).[jt]s?(x)'],
  setupFiles: ['<rootDir>/test/setenv.ts'],

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
};
