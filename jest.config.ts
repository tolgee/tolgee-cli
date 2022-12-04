import type { JestConfigWithTsJest } from 'ts-jest';

export default <JestConfigWithTsJest>{
  projects: ['<rootDir>/jest.unit.config.ts', '<rootDir>/jest.e2e.config.ts'],
};
