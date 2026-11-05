import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      'chatgpt/**',
      'claude/**',
      '.turbo/**',
      '**/*.d.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['apps/api/**/*.ts', 'apps/web/**/*.ts', 'apps/web/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'libsodium-wrappers-sumo',
              message: 'Architecture Invariant Violation: Direct cryptography imports are strictly banned in apps/api and apps/web. Use @cip/protocol for types.'
            },
            {
              name: '@noble/hashes',
              message: 'Architecture Invariant Violation: Direct cryptography imports are strictly banned in apps/api and apps/web.'
            },
            {
              name: '@noble/curves',
              message: 'Architecture Invariant Violation: Direct cryptography imports are strictly banned in apps/api and apps/web.'
            },
            {
              name: 'crypto',
              message: 'Architecture Invariant Violation: Node crypto is banned in apps/api and apps/web.'
            }
          ]
        }
      ]
    }
  }
);
