import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginNext from '@next/eslint-plugin-next';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
  },
  pluginJs.configs.recommended,
  pluginNext.configs['flat/recommended'],
  pluginPrettier,
  {
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z]' }],
      'no-console': 'off',
      'prettier/prettier': 'error',
    },
  },
];
