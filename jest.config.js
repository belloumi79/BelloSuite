import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

/** @type {import('jest').Config} */
const config = {
  coverageProvider: 'v8',
  // Tests actuels = logique pure / serveur. Pour un composant React : docblock `@jest-environment jsdom`.
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // e2e/ = Playwright (npm run e2e), pas Jest
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/e2e/'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
}

// next/jest ignore node_modules à la transformation ; jose (ESM) doit être transformé.
export default async function jestConfig() {
  const resolved = await createJestConfig(config)()
  return {
    ...resolved,
    transformIgnorePatterns: ['/node_modules/(?!(jose)/)', '^.+\\.module\\.(css|sass|scss)$'],
  }
}
