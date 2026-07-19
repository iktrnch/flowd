# Repository Guidelines

## Project Structure & Module Organization

Flowd is a frontend-only SvelteKit application. Route entry points and global styles live in `src/routes/`; `+page.svelte` mounts the full-screen editor and `layout.css` defines shared design tokens. Diagram UI is grouped by responsibility under `src/lib/components/` (`canvas/`, `shape-wheel/`, `modal/`, and `context-menu/`). Central shape and theme definitions belong in `src/lib/config/`, shared types in `src/lib/types/`, reactive document state in `src/lib/stores/`, and testable browser-independent logic in `src/lib/utils/`. Unit tests are colocated with their modules as `*.test.ts`. Static files belong in `static/`; generated output is written to `build/`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server.
- `npm run format` applies Prettier formatting across the repository.
- `npm run lint` checks formatting without modifying files.
- `npm run check` runs SvelteKit synchronization and strict Svelte/TypeScript diagnostics.
- `npm test` runs the Vitest suite once; `npm run test:watch` is useful during development.
- `npm run build` creates the static Cloudflare Pages-ready site with `adapter-static`.
- `npm run preview` serves the production build locally.

## Coding Style & Naming Conventions

Use TypeScript and Svelte 5 runes. Prettier is authoritative: tabs, single quotes, no trailing commas, and a 100-column target. Name Svelte components in PascalCase (`ShapeWheel.svelte`), utilities and configuration in kebab-case or descriptive lowercase (`shape-wheel.ts`, `theme.ts`), and exported types/classes in PascalCase. Keep components focused and move geometry, persistence, history, and export calculations into testable TypeScript modules. Reuse the shape registry, theme tokens, and geometry helpers rather than introducing parallel definitions.

## Testing Guidelines

Use Vitest with `describe`, `it`, and explicit behavioral assertions. Add or update colocated tests for interaction thresholds, geometry, storage parsing, history grouping, and export selection rules. Before submitting, run `npm run lint`, `npm run check`, `npm test`, and `npm run build`.

## Commit & Pull Request Guidelines

The history currently contains only `Initial commit`, so no broader convention is established. Use short imperative subjects such as `Add diamond export geometry`. Pull requests should explain behavior changes, list verification commands, link relevant issues, and include screenshots or a short recording for visible interaction changes. Keep unrelated refactors out of the same change.

## Browser and Data Safety

Guard `window`, `localStorage`, canvas, and download APIs so static generation remains valid. Persist only document data; never store transient selection, modal, wheel, drag, or measured DOM state.
