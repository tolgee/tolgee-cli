import type { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'E2E',
  testMatch: [
    '<rootDir>/test/e2e/**/*.(spec|test).[jt]s?(x)'
  ],
};
