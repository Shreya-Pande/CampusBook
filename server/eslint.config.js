import js from '@eslint/js'
import globals from 'globals'
import jestPlugin from 'eslint-plugin-jest'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules', 'logs', 'coverage'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    plugins: { jest: jestPlugin },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },
  prettierConfig,
]
