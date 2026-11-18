import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts from 'typescript-eslint'

// Statická analýza vedle `svelte-check` (typy): běžné chyby, `any`, nezachycené promisy.
// Spuštění: npm run lint
export default ts.config(
  { ignores: ['dist/', 'node_modules/', 'reference/', 'content-packs/', 'public/', 'coverage/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, __APP_VERSION__: 'readonly', __BUILD_TIME__: 'readonly' },
    },
    rules: {
      // Klíč v `{#each}` mají seznamy, které se mění (postavy, bytosti, balíčky, družiny, kapitoly). Pravidlo samo je vypnuté:
      // většina seznamů je statická (vlastnosti, kostky, volby) a klíč tam nic nepřináší, jen by zahltil výstup.
      'svelte/require-each-key': 'off',
      // `{' '}` a `{'; '}` vědomě drží mezery mezi výrazy (Svelte je jinak sbalí)
      'svelte/no-useless-mustaches': 'off',
      // Set/Map v čistých výpočtech nejsou reaktivní stav, SvelteSet/SvelteMap by tu jen zdražily
      'svelte/prefer-svelte-reactivity': 'off',
      // záměrné pevné mezery (nbsp) v regulárních výrazech převodníku SRD
      'no-irregular-whitespace': ['error', { skipRegExps: true, skipStrings: true, skipTemplates: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
  {
    // nezachycené promisy hlídá jen v TypeScriptu mimo komponenty (typové informace stojí čas)
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
)
