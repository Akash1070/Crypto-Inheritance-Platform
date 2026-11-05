import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      'chatgpt/**',
      'claude/**',
      '.turbo/**'
    ]
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
];

