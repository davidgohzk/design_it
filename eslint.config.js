import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Area boundaries. The dependency rule is one way only:
 *
 *   lib -> cases -> designDoc -> review -> examples -> workspace -> pages
 *
 * `lib` may be imported by anything; only src/App.tsx may import a page. Each area below names the
 * areas it may NOT import, so an illegal import fails `pnpm lint` rather than being found later by
 * a human. Cross-area imports use the `@/` alias, so the patterns match the alias.
 *
 * Flat config merges by rule name, and the last matching block wins: a second block that sets
 * `no-restricted-imports` for an already-covered file silently replaces that file's patterns. So
 * every file gets its patterns from exactly one block here, and `pages` is folded into each area's
 * list rather than declared separately.
 *
 * The pure areas may not import React: the review engine and the doc parser are plain TypeScript,
 * which is what lets them be tested without a DOM. The workspace and ui own all rendering.
 *
 * A test file may import a fixture from `cases` or `examples` whichever area it is in: fixtures are
 * the one thing the dependency order does not govern, and the exemption is what lets the rule be
 * strict everywhere else.
 */
const PAGES = 'pages'

const AREAS = {
  'src/lib': ['review', 'cases', 'designDoc', 'examples', 'workspace', PAGES],
  'src/cases': ['review', 'designDoc', 'examples', 'workspace', PAGES],
  'src/designDoc': ['review', 'examples', 'workspace', PAGES],
  'src/review': ['examples', 'workspace', PAGES],
  'src/examples': ['workspace', PAGES],
  'src/workspace': [PAGES],
  'src/ui': ['review', 'cases', 'designDoc', 'examples', 'workspace', PAGES],
}

// The pure areas: plain TypeScript, so they can be tested without a DOM.
const PURE_AREAS = ['src/lib', 'src/cases', 'src/designDoc', 'src/review', 'src/examples']

const restrict = (area, forbidden) => ({
  'no-restricted-imports': ['error', {
    paths: PURE_AREAS.includes(area)
      ? [
          { name: 'react', message: `${area} must stay free of React — rendering belongs to the workspace.` },
          { name: 'react-dom', message: `${area} must stay free of React — rendering belongs to the workspace.` },
          { name: '@mui/material', message: `${area} must stay free of MUI — rendering belongs to the workspace.` },
        ]
      : [],
    patterns: forbidden.map((target) => ({
      group: [`@/${target}`, `@/${target}/**`],
      message:
        target === PAGES
          ? 'Only src/App.tsx may import a page — pages are route shells, not a public API.'
          : `${area} must not import @/${target} — see the dependency rule in eslint.config.js.`,
    })),
  }],
})

const areaBlocks = Object.entries(AREAS).flatMap(([area, forbidden]) => [
  { files: [`${area}/**/*.{ts,tsx}`], rules: restrict(area, forbidden) },
  {
    // A test is not part of the layering: it may reach for a fixture in `cases` or `examples`, or
    // assert against a view-model in the workspace, whichever area it sits in. The purity rules
    // still apply, so a pure area cannot grow a React dependency through its tests.
    // The whole rule is restated, because a later block replaces the patterns rather than adding.
    files: [`${area}/**/*.test.{ts,tsx}`],
    rules: restrict(area, []),
  },
])

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      // Kept in step with "target" in tsconfig.app.json.
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  ...areaBlocks,
  {
    // Everything under src that is not in a listed area, and is not the router itself.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [...Object.keys(AREAS).map((area) => `${area}/**`), 'src/App.tsx', 'src/pages/**'],
    rules: restrict('src', [PAGES]),
  },
])
