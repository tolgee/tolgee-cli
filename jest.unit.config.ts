import type { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  preset: 'ts-jest',
  testEnvironment: 'node',
  displayName: 'Unit',
  testMatch: [
    '<rootDir>/test/unit/**/*.(spec|test).[jt]s?(x)'
  ],
};
