import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  pluginPrettier,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prettier/prettier': 'error',
    },
  },
];
