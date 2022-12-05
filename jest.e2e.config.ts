import type { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'E2E',
  testMatch: ['<rootDir>/test/e2e/**/*.(spec|test).[jt]s?(x)'],

  // Tests may update their global env (e.g. Tolgee properties) and cannot be concurrent.
  maxConcurrency: 1,
  testTimeout: 10e3,
  slowTestThreshold: 30e3,
};
