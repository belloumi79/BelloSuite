// ESLint 9 — configuration « flat » (remplace l'ancien .eslintrc.json, non lu par ESLint 9).
// `npm run lint` = `eslint .` (next lint n'existe plus dans Next 16).
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    // Outillage IA / documentation commités, hors application
    'skills/**',
    'agents/**',
    '.claude/**',
    '.gemini/**',
    'docs/**',
    'supabase/**',
    'prisma/*.bak',
    'test-action.js',
  ]),
  {
    rules: {
      // Dette existante (≈240 `any`) : signalée sans bloquer la CI
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'prefer-const': 'warn',
      'no-var': 'error',
      // Règles introduites par eslint-config-next 16 (React Compiler) / style : dette existante,
      // rétrogradées en avertissements pour ne pas bloquer la CI. À corriger progressivement.
      'react/no-unescaped-entities': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
    },
  },
  {
    // Scripts Node CommonJS (postinstall, outils)
    files: ['scripts/**/*.js', '*.config.js', 'jest.setup.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
])
