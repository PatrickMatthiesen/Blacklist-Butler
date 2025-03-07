// eslint.config.js
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/dist', '**/build'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescriptEslint.configs.recommended.rules,
      semi: ['error', 'always'],
      'max-nested-callbacks': ['error', { max: 4 }],
      'max-statements-per-line': ['error', { max: 2 }],
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^Abstract' }],
    },
  },
];
