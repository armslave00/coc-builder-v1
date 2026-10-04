# Repository Guidelines

## Project Structure & Module Organization

This is a static React 19, TypeScript, and Vite application for Call of Cthulhu 7e investigator cards. Archives persist in browser `localStorage`; there is no backend or database.

- `src/main.tsx`: application entry point.
- `src/App.tsx`: editor, rule library, custom content, and archive state.
- `src/styles.css`: shared styles and responsive layouts.
- `src/types.ts`: character, archive, and rule definitions.
- `src/lib/`: rule calculations, archive merging, and import/export validation; tests live alongside these modules.
- `src/data/`: shared `core.json`, era profile JSON packs, the `rules.ts` loader, and sample investigators.
- `public/`: static images and icons.
- `docs/rules-sources.md`: rule provenance and adaptation boundaries.

Keep reusable calculations and validation in `src/lib/`. Treat `dist/`, `node_modules/`, and `*.tsbuildinfo` as generated files.

## Build, Test, and Development Commands

Use Node.js 22, as specified in `.nvmrc`.

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start the local Vite server at `127.0.0.1:5173` by default.
- `npm test`: run `src/lib/*.test.ts` using `tsx` and Node's test runner.
- `npm run build`: run TypeScript checking and generate `dist/`.
- `npm run preview`: serve the production build locally.

The GitHub Pages workflow runs tests and builds before deployment. Preserve Vite's relative asset base (`./`) for subdirectory hosting.

## Coding Style & Naming Conventions

Use strict TypeScript, explicit domain types, and `import type` for type-only imports. Prefer two-space indentation, single quotes, and semicolons in new code; match surrounding formatting when editing compact existing files. Use PascalCase for React components and types, camelCase for functions and variables, and descriptive kebab-case rule IDs. No formatter or linter is configured.

## Testing Guidelines

Name tests `<module>.test.ts` in `src/lib/`, using `node:test` and `node:assert/strict`. Cover changed rule boundaries, malformed imports, definition conflicts, and export escaping. Keep randomized checks deterministic and restore mocked randomness. No coverage threshold is configured. Run tests and the production build before submitting code changes; manually verify desktop and mobile layouts for UI changes.

## Commit & Pull Request Guidelines

This checkout has no Git history to establish a commit convention. Use concise imperative subjects, such as `Fix age adjustment boundaries`. PRs should explain the problem, resulting behavior, validation performed, and related issues when available. Include screenshots for visual changes.

## Rule Data & Persistence

Document rule changes and sources in `docs/rules-sources.md`. Preserve existing IDs and archive compatibility. Retain import validation and HTML escaping, and verify that era changes preserve allocated skill data.
