import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config([
  {
    ignores: [
      'dist',
      'releases/**',
      'desktop-dist/**',
      'desktop-dist-fresh/**',
      'android/**',
      'node_modules/**',
      // Supabase Edge Functions run on Deno, not Node — they should be
      // linted by Deno's own linter, not by ESLint configured for the
      // React app. The deno.d.ts ambient-type shim uses `any` for
      // loose SDK shapes which would fail @typescript-eslint/no-explicit-any.
      'supabase/functions/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
])
